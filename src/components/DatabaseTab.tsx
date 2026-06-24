import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { User, Movimiento } from '../types';
import { formatearFecha } from '../utils';
import { RefreshCw, Trash, Search, ShieldAlert, FileSpreadsheet, Edit } from 'lucide-react';

interface DatabaseTabProps {
  user: User;
  movimientos: Movimiento[];
  onDeleteMovimiento: (id: number) => void;
  onClearHistory: () => void;
  onSync: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warn' | 'info') => void;
  onUpdateMovimiento?: (docId: string, newData: any) => Promise<void>; 
}

export default function DatabaseTab({
  user, movimientos, onDeleteMovimiento, onClearHistory, onSync, showToast, onUpdateMovimiento
}: DatabaseTabProps) {
  const [tipoFilter, setTipoFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [fechaIni, setFechaIni] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [showAuditVault, setShowAuditVault] = useState(false);

  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    mov: Movimiento | null;
    prov: string;
    fact: string;
    costoUnit: string;
  }>({ isOpen: false, mov: null, prov: '', fact: '', costoUnit: '' });

  const isRespSalidas = user.role === 'responsable_salidas';
  const isRespEntradas = user.role === 'responsable_entradas';
  const isAdmin = user.role === 'admin' || user.role === 'admin_contable';
  const isSup = user.role === 'supervisor' || user.role === 'sup_contable';
  const isConta = user.module === 'CONTABILIDAD';

  const filteredMovs = movimientos.filter(m => {
    if (showAuditVault) { if (!m.eliminado) return false; } else { if (m.eliminado) return false; }
    if (isRespSalidas && (m.tipo !== 'SALIDA' || m.registradoPor !== user.name)) return false;
    if (isRespEntradas && (m.tipo !== 'ENTRADA' || m.registradoPor !== user.name)) return false;
    if (!isRespSalidas && !isRespEntradas && tipoFilter && m.tipo !== tipoFilter) return false;
    if (fechaIni && m.fecha < fechaIni) return false;
    if (fechaFin && m.fecha > fechaFin) return false;

    if (searchTerm.trim() !== '') {
      const q = searchTerm.trim().toUpperCase();
      const matchDesc = m.descripcion.toUpperCase().includes(q);
      const matchArea = m.area.toUpperCase().includes(q);
      const matchProv = (m.prov || '').toUpperCase().includes(q);
      const matchFact = (m.fact || '').toUpperCase().includes(q);
      const matchUser = m.registradoPor.toUpperCase().includes(q);
      const matchSerie = (m.serie || '').toUpperCase().includes(q);
      if (!matchDesc && !matchArea && !matchProv && !matchFact && !matchUser && !matchSerie) return false;
    }
    return true;
  }).sort((a, b) => {
    if (a.fecha === b.fecha) return b.id - a.id;
    return b.fecha.localeCompare(a.fecha);
  });

  const handleExportExcel = () => {
    const validMovs = showAuditVault ? movimientos.filter(m => m.eliminado) : movimientos.filter(m => !m.eliminado);
    if (validMovs.length === 0) { showToast('No se cuenta con transacciones vigentes para exportar', 'error'); return; }
    
    const dataToExport = [...validMovs].sort((a, b) => { if (a.fecha === b.fecha) return b.id - a.id; return b.fecha.localeCompare(a.fecha); }).map(r => {
        if (isConta) {
          return {
            'TIPO': r.tipo === 'FACTURA_GASTO' ? 'FACTURA' : r.tipo, 'FECHA': formatearFecha(r.fecha), 'CANTIDAD': r.cantidad,
            'CONCEPTO / ARTÍCULO': r.descripcion, 'UNIDAD': r.unidad, 'CATEGORÍA DE GASTO': r.categoriaGasto || '',
            'CENTRO DE COSTO': r.area, 'PROVEEDOR': r.prov || '', 'FOLIO FACTURA': r.fact || '',
            'FECHA EMISIÓN': r.fechaFact ? formatearFecha(r.fechaFact) : '', 'HORA EMISIÓN': r.horaFact || '',
            'MÉTODO PAGO': r.metodoPago || '', 'TIPO DE RECURSO': r.tipoRecurso || '', 'MARCA': r.marca || '',
            'MODELO': r.modelo || '', 'SERIE / LOTE': r.serie || '', 'PRECIO UNITARIO ($)': r.costoUnit || 0,
            'IMPORTE PARCIAL ($)': r.costoTotal || 0, 'IMPUESTOS ($)': r.impuestos || 0, 'TOTAL FACTURA ($)': r.totalFactura || 0,
            'NOTAS / COMENTARIOS': r.notas || '', 'USUARIO SISTEMA': r.registradoPor
          };
        }
        if (user.module === 'COMPRAS') {
          return {
            'TIPO': r.tipo, 'FECHA': formatearFecha(r.fecha), 'CANTIDAD': r.cantidad, 'DESCRIPCIÓN': r.descripcion, 'UNIDAD': r.unidad,
            'ÁREA/DESTINO': r.area, 'PROVEEDOR': r.prov || '', 'FACTURA / REMISIÓN': r.fact || '', 'FECHA FACTURA': r.fechaFact ? formatearFecha(r.fechaFact) : '',
            'COSTO UNITARIO': r.costoUnit || 0, 'COSTO TOTAL': r.costoTotal || 0, 'N° AUTORIZACIÓN': r.aut || '', 'QUIEN RECIBE': r.recibe || '',
            'RESPONSABLE ÁREA': r.resp || '', 'NOTAS / COMENTARIOS': r.notas || '', 'USUARIO SISTEMA': r.registradoPor
          };
        }
        return {
            'TIPO': r.tipo, 'FECHA': formatearFecha(r.fecha), 'CANTIDAD': r.cantidad, 'DESCRIPCIÓN': r.descripcion, 'UNIDAD': r.unidad,
            'ÁREA / DESTINO': r.area, 'NOTAS / COMENTARIOS': r.notas || '', 'USUARIO SISTEMA': r.registradoPor
        };
      });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, isConta ? "Diario_Contable" : "Historial_Movimientos");
    const prefix = showAuditVault ? 'Auditoria_Eliminados_' : (isConta ? 'Libro_Diario_' : 'Bitacora_General_');
    XLSX.writeFile(workbook, `${prefix}${user.module}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('Archivo Excel generado correctamente', 'success');
  };

  const handleClearHistoryConfirm = () => {
    if (confirm("⚠️⚠️ ATENCIÓN CONFIDENCIAL: Se eliminarán de forma PERMANENTE los registros de la Bóveda.")) {
      const code = prompt("Escribe 'VACIAR' para certificar la eliminación:");
      if (code && code.toUpperCase() === 'VACIAR') onClearHistory();
      else showToast('Confirmación incorrecta', 'warn');
    }
  };

  const openEdit = (m: Movimiento) => {
    setEditModal({
      isOpen: true, mov: m, prov: m.prov || '', fact: m.fact || '', costoUnit: m.costoUnit ? String(m.costoUnit) : '0'
    });
  };

  const saveEdit = async () => {
    if (editModal.mov && editModal.mov.docId && onUpdateMovimiento) {
      const parsedCost = parseFloat(editModal.costoUnit) || 0;
      const total = parsedCost * editModal.mov.cantidad;
      await onUpdateMovimiento(editModal.mov.docId, {
        prov: editModal.prov.trim().toUpperCase(),
        fact: editModal.fact.trim().toUpperCase(),
        costoUnit: parsedCost,
        costoTotal: total
      });
      setEditModal({ isOpen: false, mov: null, prov: '', fact: '', costoUnit: '' });
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#ddd9d0] gap-4">
        <div>
          <h2 className={`text-xl md:text-2xl font-bold font-sans ${showAuditVault ? 'text-purple-800' : (isConta ? 'text-amber-800' : 'text-gray-900')}`}>
            {showAuditVault ? '🛡️ Bóveda de Auditoría (Eliminados)' : (isConta ? 'Historial y Diario Contable' : 'Historial de Movimientos')}
          </h2>
          <p className="text-xs md:text-sm text-gray-500 mt-1">{showAuditVault ? 'Visualizando anulados.' : 'Bitácora de movimientos.'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={onSync} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-50 border border-gray-300 text-gray-700 hover:bg-gray-100 flex items-center gap-1.5 cursor-pointer"><RefreshCw size={13} /> Sincronizar</button>
          {isAdmin && (<button onClick={() => setShowAuditVault(!showAuditVault)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer ${showAuditVault ? 'bg-purple-600 text-white border-purple-700' : 'bg-purple-50 text-purple-700 border-purple-200'}`}><ShieldAlert size={13} /> {showAuditVault ? 'Salir de Bóveda' : 'Auditar Eliminados'}</button>)}
          {(isAdmin || isSup) && (<button onClick={handleExportExcel} className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 cursor-pointer ${isConta ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}><FileSpreadsheet size={13} /> Descargar Excel</button>)}
          {isAdmin && showAuditVault && (<button onClick={handleClearHistoryConfirm} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 flex items-center gap-1.5 cursor-pointer"><Trash size={13} /> Vaciar Bóveda</button>)}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 bg-white border border-[#ddd9d0] p-4 rounded-xl shadow-sm">
        {!isConta && !isRespSalidas && !isRespEntradas ? (
          <select value={tipoFilter} onChange={(e) => setTipoFilter(e.target.value)} className="w-full text-xs md:text-sm border border-[#ddd9d0] rounded-lg p-2 bg-white focus:outline-none"><option value="">Todos los movimientos</option><option value="ENTRADA">Solo Entradas</option><option value="SALIDA">Solo Salidas</option></select>
        ) : isConta ? (
          <div className="text-xs text-amber-800 bg-amber-100 font-bold px-3 py-2 rounded-lg flex items-center uppercase">📊 DIARIO DE FACTURAS</div>
        ) : (<div className="text-xs text-gray-600 bg-gray-100 font-bold px-3 py-2 rounded-lg flex items-center uppercase">🚀 FILTRADO ACTIVADO</div>)}
        <div className="relative flex items-center border border-[#ddd9d0] rounded-lg px-2 bg-white focus-within:border-blue-600"><Search size={14} className="text-gray-400 mr-2 flex-shrink-0" /><input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar..." className="w-full text-xs md:text-sm bg-transparent focus:outline-none uppercase" /></div>
        <input type="date" value={fechaIni} onChange={(e) => setFechaIni(e.target.value)} className="w-full text-xs md:text-sm border border-[#ddd9d0] rounded-lg p-2 focus:outline-none" />
        <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="w-full text-xs md:text-sm border border-[#ddd9d0] rounded-lg p-2 focus:outline-none" />
      </div>

      {/* AQUÍ ESTÁ EL AJUSTE PERFECTO: Alto automático según tu pantalla */}
      <div className={`bg-white border rounded-xl shadow-sm overflow-hidden ${showAuditVault ? 'border-purple-300' : 'border-[#ddd9d0]'}`}>
        {filteredMovs.length === 0 ? (
          <div className="text-center py-12 text-gray-400"><p className="text-sm md:text-base font-semibold">No hay registros.</p></div>
        ) : (
          <div className="overflow-auto w-full" style={{ maxHeight: 'calc(100vh - 280px)', minHeight: '300px' }}>
            <table className="w-full border-collapse text-left text-xs md:text-sm">
              <thead className="sticky top-0 z-20 bg-gray-50 shadow-[0_1px_0_#ddd9d0]">
                <tr className="font-sans font-bold text-[10px] md:text-xs text-gray-500 tracking-wider uppercase">
                  <th className="px-4 py-3.5 bg-gray-50">F. Registro</th>
                  <th className="px-4 py-3.5 bg-gray-50">Tipo</th>
                  <th className="px-4 py-3.5 bg-gray-50">Cant.</th>
                  <th className="px-4 py-3.5 bg-gray-50">{isConta ? 'Concepto / Artículo' : 'Descripción'}</th>
                  {isConta && <th className="px-4 py-3.5 bg-gray-50">Detalle Factura</th>}
                  {isConta && <th className="px-4 py-3.5 bg-gray-50">Identificación Fija</th>}
                  {!isConta && <th className="px-4 py-3.5 bg-gray-50">Unidad</th>}
                  <th className="px-4 py-3.5 bg-gray-50">{isConta ? 'Centro Costo' : 'Área de Destino'}</th>
                  {user.module === 'COMPRAS' && !isConta && <th className="px-4 py-3.5 bg-gray-50">Detalles Finanzas</th>}
                  <th className="px-4 py-3.5 bg-gray-50">Comentarios</th>
                  <th className="px-4 py-3.5 bg-gray-50">Usuario</th>
                  <th className="px-4 py-3.5 bg-gray-50 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ddd9d0]">
                {filteredMovs.map((m) => {
                  const tagColor = m.tipo === 'FACTURA_GASTO' ? 'bg-amber-100 text-amber-800 border-amber-200' : (m.tipo === 'ENTRADA' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200');
                  const isAdjustment = m.area === 'AJUSTE MANUAL';
                  const isRowDeleted = m.eliminado;

                  return (
                    <tr key={m.id} className={`hover:bg-gray-50 transition-colors ${isRowDeleted ? 'bg-red-50 text-red-800' : ''}`}>
                      <td className="px-4 py-3.5 font-mono text-[11px] text-gray-600 whitespace-nowrap">{formatearFecha(m.fecha)}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap"><span className={`inline-block border px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${isAdjustment ? 'bg-purple-100 text-purple-700' : tagColor}`}>{m.tipo === 'FACTURA_GASTO' ? 'FACTURA' : m.tipo}</span></td>
                      <td className="px-4 py-3.5 font-bold text-gray-900 whitespace-nowrap">{m.cantidad}</td>
                      <td className="px-4 py-3.5 font-semibold text-gray-800 font-mono text-[12px] min-w-[200px]">{m.descripcion} {isConta && <div className="text-[9px] text-gray-500 font-sans mt-0.5 font-bold">{m.categoriaGasto}</div>}</td>
                      
                      {isConta && (
                        <td className="px-4 py-3.5 text-[11px] text-gray-600 leading-relaxed min-w-[180px]">
                          <div><b>Prov:</b> {m.prov || '-'}</div><div><b>Folio:</b> {m.fact || '-'}</div>
                          <div className="text-amber-700 font-bold mt-0.5 bg-amber-50 px-1 py-0.5 rounded inline-block border border-amber-100">Imp: ${(m.costoTotal || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
                        </td>
                      )}
                      
                      {isConta && (
                        <td className="px-4 py-3.5 text-[10px] text-gray-500 font-mono leading-relaxed min-w-[150px]">
                          {m.marca && <div>Mrc: {m.marca}</div>}{m.modelo && <div>Mod: {m.modelo}</div>}
                          {m.serie && <div className="font-bold text-gray-700 bg-gray-100 px-1 py-0.5 rounded border border-gray-200 mt-0.5">S/N: {m.serie}</div>}
                          {!m.marca && !m.serie && <span>N/A</span>}
                        </td>
                      )}

                      {!isConta && <td className="px-4 py-3.5 whitespace-nowrap"><span className="inline-block bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-semibold">{m.unidad}</span></td>}
                      <td className="px-4 py-3.5 text-gray-600 font-medium min-w-[150px]">{m.area}</td>

                      {user.module === 'COMPRAS' && !isConta && (
                        <td className="px-4 py-3.5 text-[11px] leading-relaxed text-gray-500 min-w-[220px]">
                          {m.tipo === 'ENTRADA' && !isAdjustment ? (
                            <div>
                              <div><b>Proveedor:</b> {m.prov || '-'}</div><div><b>Factura/Rem:</b> {m.fact || '-'} {m.fechaFact ? `(${formatearFecha(m.fechaFact)})` : ''}</div>
                              <div><b>Costo U:</b> ${(m.costoUnit || 0).toLocaleString('en-US')} (Total: ${(m.costoTotal || 0).toLocaleString('en-US')})</div>
                              <div><b>N° Aut:</b> {m.aut || '-'}</div>
                            </div>
                          ) : m.tipo === 'SALIDA' && !isAdjustment ? (<div><div><b>Recibe:</b> {m.recibe || '-'}</div><div><b>Resp. Área:</b> {m.resp || '-'}</div></div>) : <span className="text-gray-400">—</span>}
                        </td>
                      )}
                      
                      <td className="px-4 py-3.5 text-gray-500 min-w-[180px]">
                        {m.notas || ''} {isRowDeleted && <div className="text-[10px] text-red-600 font-bold border-t border-red-200 pt-0.5 mt-1">🗑️ Anulado por: {m.eliminadoPor}</div>}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-gray-600 whitespace-nowrap">{m.registradoPor}</td>
                      
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {!isRowDeleted && (isAdmin || isSup) && user.module !== 'INSUMOS' && (m.tipo === 'ENTRADA' || m.tipo === 'FACTURA_GASTO') && !isAdjustment && (
                            <button onClick={() => openEdit(m)} title="Completar Datos Financieros" className="inline-flex items-center justify-center w-7 h-7 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition-all cursor-pointer">
                              <Edit size={13} />
                            </button>
                          )}

                          {!isRowDeleted ? (
                            <button onClick={() => onDeleteMovimiento(m.id)} title="Anular Movimiento" className="inline-flex items-center justify-center w-7 h-7 rounded bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 transition-all cursor-pointer">✕</button>
                          ) : <span className="text-xs font-mono text-red-500 font-bold uppercase">Anulado</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editModal.isOpen && editModal.mov && (
        <div className="fixed inset-0 bg-[#1a1814]/60 backdrop-blur-xs flex items-center justify-center p-4 z-100 transition-opacity">
          <div className="bg-white rounded-xl max-w-[400px] w-full p-6 shadow-2xl border border-[#ddd9d0] space-y-4">
            <h3 className="text-sm font-bold text-blue-800 border-b pb-2 flex items-center gap-2">
              <Edit size={18} /> Completar Datos Financieros
            </h3>
            <p className="text-[11px] text-gray-500">Agrega o corrige el costo y factura del artículo: <span className="font-bold text-gray-800">{editModal.mov.descripcion}</span></p>
            
            <div className="space-y-3 pt-2">
              <div className="form-group pb-0">
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Proveedor (Opcional)</label>
                <input type="text" value={editModal.prov} onChange={(e) => setEditModal({...editModal, prov: e.target.value})} className="w-full text-xs border border-[#ddd9d0] rounded-lg px-3 py-2 uppercase focus:border-blue-600 focus:outline-none" placeholder="EJ. OFFICE DEPOT" />
              </div>
              <div className="form-group pb-0">
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Folio Factura (Opcional)</label>
                <input type="text" value={editModal.fact} onChange={(e) => setEditModal({...editModal, fact: e.target.value})} className="w-full text-xs border border-[#ddd9d0] rounded-lg px-3 py-2 uppercase focus:border-blue-600 focus:outline-none" placeholder="EJ. FAC-1029" />
              </div>
              <div className="form-group pb-0">
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Costo Unitario Real ($)</label>
                <input type="number" step="0.01" min="0" value={editModal.costoUnit} onChange={(e) => setEditModal({...editModal, costoUnit: e.target.value})} className="w-full text-sm font-bold text-blue-700 border border-[#ddd9d0] rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none" placeholder="0.00" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button onClick={() => setEditModal({isOpen: false, mov: null, prov: '', fact: '', costoUnit: ''})} className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg cursor-pointer">Cancelar</button>
              <button onClick={saveEdit} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-md cursor-pointer">Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}