export type Plan = "Mensual" | "Inscripción" | "Promoción por pago puntual" | "Semana" | "Quincena" | "Visita";
export type TipoIdentificacion = "INE" | "CURP" | "Pasaporte" | "Licencia" | "Visa";
export type EstadoMX =
  | "Aguascalientes" | "Baja California" | "Baja California Sur" | "Campeche" | "Chiapas"
  | "Chihuahua" | "Ciudad de México" | "Coahuila" | "Colima" | "Durango" | "Guanajuato"
  | "Guerrero" | "Hidalgo" | "Jalisco" | "México" | "Michoacán" | "Morelos" | "Nayarit"
  | "Nuevo León" | "Oaxaca" | "Puebla" | "Querétaro" | "Quintana Roo" | "San Luis Potosí"
  | "Sinaloa" | "Sonora" | "Tabasco" | "Tamaulipas" | "Tlaxcala" | "Veracruz" | "Yucatán" | "Zacatecas";

export const ESTADOS_MX: EstadoMX[] = [
  "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas",
  "Chihuahua", "Ciudad de México", "Coahuila", "Colima", "Durango", "Guanajuato",
  "Guerrero", "Hidalgo", "Jalisco", "México", "Michoacán", "Morelos", "Nayarit",
  "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí",
  "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas",
];

export interface TutorInput {
  nombre: string;
  apellido: string;
  telefono: string;
  email?: string;
  parentesco?: string;
  tipo_identificacion: TipoIdentificacion;
  numero_identificacion: string;
}

export interface Tutor {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string | null;
  parentesco: string | null;
  tipo_identificacion: TipoIdentificacion;
  numero_identificacion: string;
}

export interface Socio {
  id: string;
  folio: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  email: string;
  telefono: string;
  fecha_nacimiento: string;
  tipo_identificacion: TipoIdentificacion;
  numero_identificacion: string;
  direccion: string | null;
  estado: EstadoMX;
  municipio: string;
  contacto_emergencia: string | null;
  telefono_emergencia: string | null;
  padecimiento: string | null;
  plan: Plan;
  es_menor: boolean;
  tutor_id: string | null;
  firma_path: string | null;
  contrato_aceptado: boolean;
  contrato_aceptado_en: string | null;
  fecha_registro: string;
  hora_registro: string;
  creado_por: string | null;
  creado_en: string;
  actualizado_en: string;
  eliminado_en: string | null;
  eliminado_por: string | null;
}
