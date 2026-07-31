// Vercel Serverless Function — corre en Node, NO en el navegador.
// Genera un PDF real (no HTML) del contrato usando un Chromium headless.
//
// Seguridad: el kiosco no tiene sesión de staff, así que en vez de confiar
// en el cliente para mandar los datos del socio, este endpoint:
//   1) Recibe sólo el socio_id.
//   2) Vuelve a consultar Supabase con la service_role key (nunca expuesta
//      al navegador) para traer los datos reales y autoritativos.
//   3) Sólo permite generar el PDF de un registro de los últimos 15
//      minutos — así una persona sólo puede descargar SU PROPIO contrato
//      recién firmado, no adivinar el UUID de otro socio para bajar el suyo.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { buildContractHTML } from "../src/contrato.js";
import type { Socio, Tutor } from "../src/types.js";

const VENTANA_DESCARGA_MS = 15 * 60 * 1000; // 15 minutos

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido." });
    return;
  }

  const { socio_id } = (req.body || {}) as { socio_id?: string };
  if (!socio_id || typeof socio_id !== "string") {
    res.status(400).json({ error: "Falta socio_id." });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ error: "Configuración del servidor incompleta (faltan variables de entorno)." });
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let browser;
  try {
    const { data: socioData, error: socioError } = await supabase
      .from("socios").select("*").eq("id", socio_id).single();

    if (socioError || !socioData) {
      res.status(404).json({ error: "Socio no encontrado." });
      return;
    }
    const socio = socioData as Socio;

    const creadoHaceMs = Date.now() - new Date(socio.creado_en).getTime();
    if (creadoHaceMs > VENTANA_DESCARGA_MS) {
      res.status(403).json({ error: "Este enlace de descarga ya expiró. Pide ayuda al staff para obtener tu contrato desde el panel." });
      return;
    }

    let tutor: Tutor | null = null;
    if (socio.es_menor && socio.tutor_id) {
      const { data } = await supabase.from("tutores").select("*").eq("id", socio.tutor_id).single();
      tutor = data as Tutor | null;
    }

    let firmaDataUrl: string | null = null;
    if (socio.firma_path) {
      const { data } = await supabase.storage.from("firmas").download(socio.firma_path);
      if (data) {
        const buf = Buffer.from(await data.arrayBuffer());
        firmaDataUrl = `data:image/png;base64,${buf.toString("base64")}`;
      }
    }

    const html = buildContractHTML(socio, tutor, firmaDataUrl);

    chromium.setHeadlessMode = true;
    chromium.setGraphicsMode = false;

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless as boolean | "shell",
    });
    const page = await browser.newPage();
    // El HTML es autocontenido (estilos inline, firma como data URI), así
    // que no hay recursos externos que esperar — "load" es suficiente.
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "letter",
      printBackground: true,
      margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Contrato_${socio.folio}.pdf"`);
    res.status(200).send(Buffer.from(pdf));
  } catch (err: any) {
    console.error("generar-contrato-pdf falló:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: `No se pudo generar el PDF: ${err?.message || "error desconocido"}` });
    }
  } finally {
    if (browser) await browser.close();
  }
}
