import React, { useState } from 'react';
import { User, CatalogoItem, UNIDADES } from '../types';
import { PlusCircle, Trash, CheckCircle2, RefreshCw, FileText, Calculator } from 'lucide-react';

interface AccountingCaptureProps {
  user: User;
  onSave: (items: any[], catalogsToInsert: CatalogoItem[]) => void;
  areas: string[];
  proveedores: string[];
  showToast: (msg: string, type?: 'success' | 'error' | 'warn' | 'info') => void;
}

export default function AccountingCapture({ user, onSave, areas, proveedores, showToast }: AccountingCaptureProps) {
  // Datos de Cabecera (Factura)
  const [prov, setProv] = useState('');
  const [fact, setFact] = useState('');
  const [fechaFact, setFechaFact] = useState(() => new Date().toISOString().split('T')[0]);
  const [horaFact, setHoraFact] = useState('');
  const [metodoPago, setMetodoPago] = useState('PPD - PAGO EN PARCIALIDADES O DIFERIDO');
  const [tipoRecurso, setTipoRecurso] = useState('INGRESOS PROPIOS');
  const [areaSol, setAreaSol] = useState('');
  const [recibe, setRecibe] = useState('');
  const [aut, setAut] = useState('');
  const [notasHeader, setNotasHeader] = useState('');

  // Totales de Factura
  const [impuestos, setImpuestos] = useState<string>('0');

  // Datos de las Partidas (Artículos)
  const createEmptyRow = () => ({
    id: 'row-' + Math.random().toString(36).substr(2, 9),
    cantidad: '',
    unidad: 'PIEZA',
    descripcion: '',
    marca: '',
    modelo: '',
    serie: '',
    categoriaGasto: 'BIEN A INVENTARIAR',
    costoUnit: ''
  });

  const [rows, setRows] = useState([createEmptyRow()]);

  const addLine = () => setRows([...rows, createEmptyRow()]);
  const removeLine = (id: string) => {
    if (rows.length <= 1) { showToast('Debe haber al menos un concepto en la factura', 'warn'); return; }
    setRows(rows.filter(r => r.id !== id));
  };

  const updateRow = (id: string, field: string, value: string) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const resetForm = () => {
    setProv(''); setFact(''); setHoraFact(''); setNotasHeader(''); setRecibe(''); setAut(''); setImpuestos('0');
    setRows([createEmptyRow()]);
  };

  // Cálculos Automáticos
  const subtotal = rows.reduce((sum, r) => sum + ((parseFloat(r.cantidad) || 0) * (parseFloat(r.costoUnit) || 0)), 0);
  const totalFactura = subtotal + (parseFloat(impuestos) || 0);

  const validateAndSave = () => {
    if (!prov || !fact || !fechaFact) {
      showToast('Proveedor, Folio y Fecha de factura son obligatorios', 'error');
      return;
    }

    const itemsToSave: any[] = [];
    const catalogsToInsert: CatalogoItem[] = [];
    let hasError = false;

    for (const row of rows) {
      const qty = parseFloat(row.cantidad) || 0;
      const desc = row.descripcion.trim().toUpperCase();
      const cUnit = parseFloat(row.costoUnit) || 0;

      if (!desc || qty <= 0) {
        showToast('Todas las líneas deben tener descripción y cantidad mayor a 0', 'error');
        hasError = true; break;
      }
      if (cUnit < 0) {
        showToast(`Revisa el costo unitario de: "${desc}"`, 'error');
        hasError = true; break;
      }

      itemsToSave.push({
        cantidad: qty,
        descripcion: desc,
        unidad: row.unidad,
        area: areaSol || 'ALMACÉN / EXTERNO',
        notas: notasHeader.trim().toUpperCase(),
        fecha: fechaFact,
        prov: prov.trim().toUpperCase(),
        fact: fact.trim().toUpperCase(),
        fechaFact: fechaFact,
        horaFact: horaFact,
        costoUnit: cUnit,
        costoTotal: qty * cUnit,
        aut: aut.trim().toUpperCase(),
        tipoCompra: 'RESURTIBLE',
        recibe: recibe.trim().toUpperCase(),
        metodoPago: metodoPago,
        tipoRecurso: tipoRecurso,
        categoriaGasto: row.categoriaGasto,
        marca: row.marca.trim().toUpperCase(),
        modelo: row.modelo.trim().toUpperCase(),
        serie: row.serie.trim().toUpperCase(),
        impuestos: parseFloat(impuestos) || 0,
        totalFactura: totalFactura
      });

      if (row.categoriaGasto !== 'SERVICIO' && row.categoriaGasto !== 'HONORARIOS') {
        catalogsToInsert.push({ descripcion: desc, unidad: row.unidad, tipoCompra: 'RESURTIBLE' });
      }
    }

    if (hasError) return;
    onSave(itemsToSave, catalogsToInsert);
    showToast(`✅ Factura ${fact} registrada con éxito en el libro contable`, 'success');
    resetForm();
  };

  return (
    <div className="space-y-6">
      <div className="page-header pb-4 border-b border-[#ddd9d0]">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="text-amber-600" /> Registro de Factura (Gasto / Inversión)
        </h2>
        <p className="text-sm text-gray-500 mt-1">Capture los datos fiscales y los bienes a inventariar o servicios consumidos.</p>
      </div>

      {/* CABECERA DE LA FACTURA */}
      <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-amber-600 to-amber-800 p-4 text-white">
          <h3 className="text-sm font-bold tracking-wider uppercase">1. Datos Fiscales y Administrativos</h3>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="form-group pb-0">
            <label className="block text-xs font-bold text-gray-700 mb-1">Proveedor / Emisor</label>
            <input 
              type="text" 
              list="prov-list"
              value={prov} 
              onChange={e => setProv(e.target.value)} 
              placeholder="Ej. REPRESENTACIONES DE AUDIO" 
              className="w-full border border-[#ddd9d0] rounded-lg px-3 py-2 text-xs uppercase" 
            />
            {/* AQUÍ ESTÁ EL NUEVO AUTOCOMPLETADO */}
            <datalist id="prov-list">
              {proveedores.map(p => <option key={p} value={p} />)}
            </datalist>
          </div>
          <div className="form-group pb-0">
            <label className="block text-xs font-bold text-gray-700 mb-1">Folio Factura (UUID / Serie)</label>
            <input type="text" value={fact} onChange={e => setFact(e.target.value)} placeholder="Ej. FE280409" className="w-full border border-[#ddd9d0] rounded-lg px-3 py-2 text-xs uppercase font-mono" />
          </div>
          <div className="form-group pb-0">
            <label className="block text-xs font-bold text-gray-700 mb-1">Fecha Emisión</label>
            <input type="date" value={fechaFact} onChange={e => setFechaFact(e.target.value)} className="w-full border border-[#ddd9d0] rounded-lg px-3 py-2 text-xs" />
          </div>
          <div className="form-group pb-0">
            <label className="block text-xs font-bold text-gray-700 mb-1">Hora Emisión (Opcional)</label>
            <input type="time" value={horaFact} onChange={e => setHoraFact(e.target.value)} className="w-full border border-[#ddd9d0] rounded-lg px-3 py-2 text-xs" />
          </div>
          <div className="form-group pb-0">
            <label className="block text-xs font-bold text-gray-700 mb-1">Método de Pago</label>
            <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)} className="w-full border border-[#ddd9d0] rounded-lg px-3 py-2 text-xs bg-white">
              <option value="PPD - PAGO EN PARCIALIDADES">PPD - PAGO EN PARCIALIDADES (99)</option>
              <option value="PUE - PAGO EN UNA SOLA EXHIBICIÓN">PUE - PAGO EN UNA SOLA EXHIBICIÓN</option>
              <option value="TRANSFERENCIA ELECTRÓNICA">TRANSFERENCIA ELECTRÓNICA (03)</option>
            </select>
          </div>
          <div className="form-group pb-0">
            <label className="block text-xs font-bold text-gray-700 mb-1">Tipo de Recurso</label>
            <select value={tipoRecurso} onChange={e => setTipoRecurso(e.target.value)} className="w-full border border-[#ddd9d0] rounded-lg px-3 py-2 text-xs bg-white">
              <option value="INGRESOS PROPIOS">INGRESOS PROPIOS</option>
              <option value="SUBSIDIO FEDERAL">SUBSIDIO FEDERAL</option>
              <option value="SUBSIDIO ESTATAL">SUBSIDIO ESTATAL</option>
              <option value="OTRO">OTRO</option>
            </select>
          </div>
          <div className="form-group pb-0">
            <label className="block text-xs font-bold text-gray-700 mb-1">Área Solicitante / Centro de Costo</label>
            <select value={areaSol} onChange={e => setAreaSol(e.target.value)} className="w-full border border-[#ddd9d0] rounded-lg px-3 py-2 text-xs bg-white">
              <option value="">SELECCIONE ÁREA...</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="form-group pb-0">
            <label className="block text-xs font-bold text-gray-700 mb-1">Quien Autoriza Compra</label>
            <input type="text" value={aut} onChange={e => setAut(e.target.value)} placeholder="Nombre o Depto" className="w-full border border-[#ddd9d0] rounded-lg px-3 py-2 text-xs uppercase" />
          </div>
        </div>
      </div>

      {/* DETALLE DE PARTIDAS (ITEMS) */}
      <div className="bg-white rounded-xl border border-[#ddd9d0] shadow-sm overflow-hidden">
        <div className="bg-gray-100 p-4 border-b border-[#ddd9d0]">
          <h3 className="text-sm font-bold text-gray-700 tracking-wider uppercase">2. Conceptos / Bienes a Inventariar</h3>
        </div>
        <div className="p-4 overflow-x-auto">
          <div className="min-w-[1000px] space-y-2">
            <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-gray-500 uppercase px-2">
              <div className="col-span-1">Cant.</div>
              <div className="col-span-2">Descripción (Concepto)</div>
              <div className="col-span-2">Categoría Gasto</div>
              <div className="col-span-1">Marca</div>
              <div className="col-span-1">Modelo</div>
              <div className="col-span-2">Serie / Lote</div>
              <div className="col-span-1">Precio Unit. $</div>
              <div className="col-span-1">Importe $</div>
              <div className="col-span-1 text-center">Acción</div>
            </div>

            {rows.map((row) => (
              <div key={row.id} className="grid grid-cols-12 gap-2 items-center border border-gray-200 p-2 rounded-lg bg-white">
                <div className="col-span-1"><input type="number" min="0" step="0.01" value={row.cantidad} onChange={e => updateRow(row.id, 'cantidad', e.target.value)} className="w-full text-xs border rounded p-1.5" placeholder="0" /></div>
                <div className="col-span-2"><input type="text" value={row.descripcion} onChange={e => updateRow(row.id, 'descripcion', e.target.value)} className="w-full text-xs border rounded p-1.5 uppercase" placeholder="MICRÓFONO SHURE..." /></div>
                <div className="col-span-2">
                  <select value={row.categoriaGasto} onChange={e => updateRow(row.id, 'categoriaGasto', e.target.value)} className="w-full text-xs border rounded p-1.5 bg-gray-50 font-semibold text-amber-700">
                    <option value="BIEN A INVENTARIAR">📦 BIEN A INVENTARIAR</option>
                    <option value="CONSUMIBLE">📎 CONSUMIBLE</option>
                    <option value="SERVICIO">🛠️ SERVICIO</option>
                    <option value="ALIMENTOS Y BEBIDAS">🍔 ALIMENTOS / BEBIDAS</option>
                    <option value="EVENTO">🎪 EVENTOS / RENTA</option>
                  </select>
                </div>
                <div className="col-span-1"><input type="text" value={row.marca} onChange={e => updateRow(row.id, 'marca', e.target.value)} className="w-full text-xs border rounded p-1.5 uppercase" placeholder="SHURE" /></div>
                <div className="col-span-1"><input type="text" value={row.modelo} onChange={e => updateRow(row.id, 'modelo', e.target.value)} className="w-full text-xs border rounded p-1.5 uppercase" placeholder="KSM141" /></div>
                <div className="col-span-2"><input type="text" value={row.serie} onChange={e => updateRow(row.id, 'serie', e.target.value)} className="w-full text-xs border rounded p-1.5 uppercase font-mono" placeholder="2DD0807..." /></div>
                <div className="col-span-1"><input type="number" min="0" step="0.01" value={row.costoUnit} onChange={e => updateRow(row.id, 'costoUnit', e.target.value)} className="w-full text-xs border rounded p-1.5 font-bold" placeholder="$0.00" /></div>
                <div className="col-span-1 text-right text-xs font-bold text-gray-700 bg-gray-100 p-1.5 rounded border border-gray-200">
                  ${((parseFloat(row.cantidad) || 0) * (parseFloat(row.costoUnit) || 0)).toLocaleString('en-US', {minimumFractionDigits: 2})}
                </div>
                <div className="col-span-1 text-center">
                  <button onClick={() => removeLine(row.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash size={14} /></button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={addLine} className="mt-3 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-1"><PlusCircle size={14} /> Agregar Concepto</button>
        </div>
      </div>

      {/* SUMATORIAS Y GUARDADO */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 bg-white border border-[#ddd9d0] p-5 rounded-xl shadow-sm">
        <div className="w-full md:w-1/2">
          <label className="block text-xs font-bold text-gray-700 mb-1">Notas u Observaciones del Registro</label>
          <textarea value={notasHeader} onChange={e => setNotasHeader(e.target.value)} rows={3} className="w-full border border-[#ddd9d0] rounded-lg px-3 py-2 text-xs uppercase" placeholder="Observaciones de la factura..."></textarea>
        </div>
        <div className="w-full md:w-1/3 space-y-2 border border-emerald-200 bg-emerald-50/30 p-4 rounded-lg">
          <div className="flex justify-between items-center text-sm font-semibold text-gray-600">
            <span>Sub-Total:</span>
            <span className="font-mono">${subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
          </div>
          <div className="flex justify-between items-center text-sm font-semibold text-gray-600">
            <span>Impuestos (IVA/Otros): $</span>
            <input type="number" step="0.01" value={impuestos} onChange={e => setImpuestos(e.target.value)} className="w-24 text-right border border-gray-300 rounded p-1 text-xs focus:outline-none" />
          </div>
          <div className="flex justify-between items-center text-lg font-bold text-emerald-800 border-t border-emerald-200 pt-2">
            <span>TOTAL FACTURA:</span>
            <span className="font-mono">${totalFactura.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button onClick={resetForm} className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center gap-1.5"><RefreshCw size={15} /> Limpiar</button>
        <button onClick={validateAndSave} className="px-6 py-2.5 text-sm font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 shadow-md flex items-center gap-1.5"><CheckCircle2 size={16} /> Guardar Factura en Libro</button>
      </div>
    </div>
  );
}