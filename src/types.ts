export interface Movimiento {
  docId?: string;
  id: number;
  tipo: 'ENTRADA' | 'SALIDA' | 'FACTURA_GASTO'; // Añadimos tipo Factura
  fecha: string;
  cantidad: number;
  descripcion: string;
  unidad: string;
  area: string;
  notas: string;
  registradoPor: string;
  eliminado: boolean;
  eliminadoPor?: string;
  
  // Campos existentes de Compras
  prov?: string;
  fact?: string;
  fechaFact?: string;
  costoUnit?: number;
  costoTotal?: number;
  aut?: string;
  tipoCompra?: string;
  recibe?: string;
  resp?: string;

  // NUEVOS CAMPOS CONTABLES / FACTURACIÓN
  horaFact?: string;
  impuestos?: number;
  totalFactura?: number;
  metodoPago?: string;
  tipoRecurso?: string;
  categoriaGasto?: 'BIEN A INVENTARIAR' | 'CONSUMIBLE' | 'SERVICIO' | 'ALIMENTOS Y BEBIDAS' | 'EVENTO' | string;
  marca?: string;
  modelo?: string;
  serie?: string;
}

export interface CatalogoItem {
  descripcion: string;
  unidad: string;
  tipoCompra?: string;
  categoriaGasto?: string;
}

export interface User {
  username: string;
  pass: string;
  role: 'admin' | 'supervisor' | 'responsable_salidas' | 'responsable_entradas' | 'resp_almacen' | 'admin_contable' | 'sup_contable' | 'resp_contable' | 'resp_gastos';
  module: 'INSUMOS' | 'COMPRAS' | 'CONTABILIDAD'; // Nuevo Módulo Maestro
  name: string;
}

export const USERS: Record<string, Omit<User, 'username'>> = {
  // MÓDULO INSUMOS (Supplies)
  admin:          { pass: 'ccu2024',      role: 'admin',                module: 'INSUMOS', name: 'Administrador' },
  supervisor:     { pass: 'insumos2024',  role: 'supervisor',           module: 'INSUMOS', name: 'Supervisor' },
  responsable:    { pass: 'resp2024',     role: 'responsable_salidas',  module: 'INSUMOS', name: 'Resp. de Insumos' },
  
  // MÓDULO COMPRAS (Purchases)
  admin_compras:  { pass: 'compra2024',   role: 'admin',                module: 'COMPRAS', name: 'Admin. Compras' },
  sup_compras:    { pass: 'supcompra24',  role: 'supervisor',           module: 'COMPRAS', name: 'Sup. Compras' },
  resp_compras:   { pass: 'respcompra24', role: 'responsable_entradas', module: 'COMPRAS', name: 'Resp. Compras' },
  resp_entregas:  { pass: 'entrega2024',  role: 'responsable_salidas',  module: 'COMPRAS', name: 'Resp. Entregas' },
  resp_almacen:   { pass: 'almacen2026',  role: 'resp_almacen',         module: 'COMPRAS', name: 'Jefe Almacén' },

  // NUEVO: MÓDULO CONTABILIDAD (Gastos y Facturas)
  admin_conta:    { pass: 'conta2026',    role: 'admin_contable',       module: 'CONTABILIDAD', name: 'Admin Contable' },
  sup_conta:      { pass: 'supconta26',   role: 'sup_contable',         module: 'CONTABILIDAD', name: 'Sup. Contable' },
  resp_conta:     { pass: 'respconta26',  role: 'resp_contable',        module: 'CONTABILIDAD', name: 'Resp. Contable' },
  resp_gastos:    { pass: 'gastos2026',   role: 'resp_gastos',          module: 'CONTABILIDAD', name: 'Resp. de Gastos' }
};

export const UNIDADES = [
  'GALÓN', 'LITRO', 'KG', 'PIEZA', 'CAJA', 'PAQUETE', 'PAR', 'BIDÓN 20 LITROS', 'ROLLO', 'SERVICIO', 'HONORARIOS', 'OTRO'
];