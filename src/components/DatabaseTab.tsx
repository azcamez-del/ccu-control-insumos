import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { User, Movimiento } from '../types';
import { formatearFecha } from '../utils';
import { RefreshCw, Trash, Search, ShieldAlert, FileSpreadsheet } from 'lucide-react';

interface DatabaseTabProps {
  user: User;
  movimientos: Movimiento[];
  onDeleteMovimiento: (id: number) => void;
  onClearHistory: () => void;
  onSync: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warn' | 'info') => void;
}

export default function DatabaseTab({
  user,
  movimientos,
  onDeleteMovimiento,
  onClearHistory,
  onSync,
  showToast
}: DatabaseTabProps) {
  const [tipoFilter, setTipoFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [fechaIni, setFechaIni] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  
  const [showAuditVault, setShowAuditVault] = useState(false);

  const isRespSalidas = user.role === 'responsable_salidas';
  const isRespEntradas = user.role === 'responsable_entradas';
  const isAdmin = user.role === 'admin';
  const isSup = user.role === 'supervisor';

  const filteredMovs = movimientos.filter(m => {
    if (showAuditVault) {
      if (!m.eliminado) return false;
    } else {
      if (m.eliminado) return false;
    }

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
      if (!matchDesc && !matchArea && !matchProv && !matchFact && !matchUser) return false;
    }

    return true;
  }).sort((a, b) => {
    if (a.fecha === b.fecha) return b.id - a.id;
    return b.fecha.localeCompare(a.fecha);
  });

  const handleExportExcel = () => {
    const validMovs = showAuditVault 
      ? movimientos.filter(m => m.eliminado) 
      : movimientos.filter(m => !m.eliminado);

    if (validMovs.length === 0) {
      showToast('No se cuenta con transacciones vigentes para exportar en esta vista', 'error');
      return;
    }
    
    // Preparar los datos para Excel
    const dataToExport = [...validMovs]
      .sort((a, b) => { 
        if (a.fecha === b.fecha) return b.id - a.id; 
        return b.fecha.localeCompare(a.fecha); 
      })
      .map(r => {
        if (user.module === 'COMPRAS') {
          return {
            'TIPO': r.tipo,
            'FECHA': formatearFecha(r.fecha),
            'CANTIDAD': r.cantidad,
            'DESCRIPCIÓN': r.descripcion,
            'UNIDAD': r.unidad,
            'ÁREA/DESTINO': r.area,
            'PROVEEDOR': r.prov || '',
            'FACTURA / REMISIÓN': r.fact || '',
            'FECHA FACTURA': r.fechaFact ? formatearFecha(r.fechaFact) : '',
            'COSTO UNITARIO': r.costoUnit || 0,
            'COSTO TOTAL': r.costoTotal || 0,
            'N° AUTORIZACIÓN': r.aut || '',
            'QUIEN RECIBE': r.recibe || '',
            'RESPONSABLE ÁREA': r.resp || '',
            'NOTAS / COMENTARIOS': r.notas || '',
            'USUARIO SISTEMA': r.registradoPor
          };
        }
        return {
            'TIPO': r.tipo,
            'FECHA': formatearFecha(r.fecha),
            'CANTIDAD': r.cantidad,
            'DESCRIPCIÓN': r.descripcion,
            'UNIDAD': r.unidad,
            'ÁREA / DESTINO': r.area,
            'NOTAS / COMENTARIOS': r.notas || '',
            'USUARIO SISTEMA': r.registradoPor
        };
      });

    // Crear el libro de Excel y descargarlo
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Historial_Movimientos");
    
    const prefix = showAuditVault ? 'Auditoria_Eliminados_' : 'Bitacora_General_';
    XLSX.writeFile(workbook, `${prefix}${user.module}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    
    showToast('Archivo Excel generado y descargado correctamente', 'success');
  };

  const handleClearHistoryConfirm = () => {
    if (confirm("⚠️⚠️ ATENCIÓN CONFIDENCIAL: Se eliminarán de forma PERMANENTE los registros que están en la Bóveda de Auditoría.")) {
      const code = prompt("Escribe 'VACIAR' para certificar la eliminación:");
      if (code && code.toUpperCase() === 'VACIAR') {
        onClearHistory();
      } else {
        showToast('Confirmación incorrecta, acción cancelada', 'warn');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#ddd9d0] gap-4">
        <div>
          <h2 className={`text-xl md:text-2xl font-bold font-sans ${showAuditVault ? 'text-purple-800' : 'text-gray-900'}`}>
            {showAuditVault ? '🛡️ Bóveda de Auditoría (Eliminados)' : 'Historial de Movimientos'}
          </h2>
          <p className="text-xs md:text-sm text-gray-500 mt-1">
            {showAuditVault 
              ? 'Área restringida. Visualizando registros anulados por el personal.' 
              : 'Bitácora de todos los registros válidos del almacén.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={onSync} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-50 border border-gray-300 text-gray-700 hover:bg-gray-100 flex items-center gap-1.5 cursor-pointer">
            <RefreshCw size={13} /> Sincronizar
          </button>
          
          {/* El botón de auditar sigue siendo SOLO para el Admin */}
          {isAdmin && (
            <button
              onClick={() => setShowAuditVault(!showAuditVault)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 cursor-pointer transition-colors ${showAuditVault ? 'bg-purple-600 text-white border-purple-700 hover:bg-purple-700' : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'}`}
            >
              <ShieldAlert size={13} /> {showAuditVault ? 'Salir de Bóveda' : 'Auditar Eliminados'}
            </button>
          )}

          {/* AQUÍ ESTÁ EL CAMBIO: Ahora Admin Y Supervisor pueden descargar el Excel */}
          {(isAdmin || isSup) && (
            <button onClick={handleExportExcel} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 flex items-center gap-1.5 cursor-pointer">
              <FileSpreadsheet size={13} /> {showAuditVault ? 'Excel Auditoría' : 'Descargar a Excel'}
            </button>
          )}

          {/* Vaciar bóveda sigue siendo SOLO para el Admin y solo dentro de la bóveda */}
          {isAdmin && showAuditVault && (
            <button onClick={handleClearHistoryConfirm} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 border border-red-200 text-red-650 hover:bg-red-100 text-red-700 flex items-center gap-1.5 cursor-pointer">
              <Trash size={13} /> Vaciar Bóveda
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 bg-white border border-[#ddd9d0] p-4 rounded-xl shadow-sm">
        {!isRespSalidas && !isRespEntradas ? (
          <select value={tipoFilter} onChange={(e) => setTipoFilter(e.target.value)} className="w-full text-xs md:text-sm border border-[#ddd9d0] rounded-lg p-2 bg-white focus:border-blue-600 focus:outline-none transition-colors">
            <option value="">Todos los movimientos</option>
            <option value="ENTRADA">Solo Entradas</option>
            <option value="SALIDA">Solo Salidas</option>
          </select>
        ) : (
          <div className="text-xs text-gray-600 bg-gray-100 font-bold tracking-wider px-3 py-2 rounded-lg flex items-center uppercase">
            🚀 {isRespSalidas ? 'FILTRADO: SOLO ENTREGAS' : 'FILTRADO: SOLO RECEPCIONES'}
          </div>
        )}

        <div className="relative col-span-1 sm:col-span-1 md:col-span-1 flex items-center border border-[#ddd9d0] rounded-lg px-2 bg-white focus-within:border-blue-600 transition-colors">
          <Search size={14} className="text-gray-400 mr-2 flex-shrink-0" />
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar..." className="w-full text-xs md:text-sm text-gray-900 bg-white focus:outline-none uppercase" />
        </div>

        <input type="date" value={fechaIni} onChange={(e) => setFechaIni(e.target.value)} title="Fecha de Inicio" className="w-full text-xs md:text-sm border border-[#ddd9d0] rounded-lg p-2 bg-white focus:border-blue-600 focus:outline-none" />
        <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} title="Fecha de Fin" className="w-full text-xs md:text-sm border border-[#ddd9d0] rounded-lg p-2 bg-white focus:border-blue-600 focus:outline-none" />
      </div>

      <div className={`bg-white border rounded-xl shadow-sm overflow-hidden ${showAuditVault ? 'border-purple-300' : 'border-[#ddd9d0]'}`}>
        {filteredMovs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm md:text-base font-semibold">{showAuditVault ? 'No hay registros eliminados en la bóveda.' : 'No se encontraron registros cargados.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs md:text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-[#ddd9d0] font-sans font-bold text-[10px] md:text-xs text-gray-500 tracking-wider uppercase">
                  <th className="px-4 py-3.5">F. Registro</th><th className="px-4 py-3.5">Tipo</th><th className="px-4 py-3.5">Cant.</th>
                  <th className="px-4 py-3.5">Descripción</th><th className="px-4 py-3.5">Unidad</th><th className="px-4 py-3.5">Área de Destino</th>
                  {user.module === 'COMPRAS' && <th className="px-4 py-3.5">Detalles Finanzas / Destinatario</th>}
                  <th className="px-4 py-3.5">Comentarios</th><th className="px-4 py-3.5">Usuario</th><th className="px-4 py-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ddd9d0] whitespace-nowrap">
                {filteredMovs.map((m) => {
                  const tagColor = m.tipo === 'ENTRADA' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200';
                  const isAdjustment = m.area === 'AJUSTE MANUAL';
                  const isRowDeleted = m.eliminado;

                  return (
                    <tr key={m.id} className={`hover:bg-gray-50 transition-colors ${isRowDeleted ? 'bg-red-50 text-red-800' : ''}`}>
                      <td className="px-4 py-3.5 font-mono text-[11px] text-gray-600">{formatearFecha(m.fecha)}</td>
                      <td className="px-4 py-3.5"><span className={`inline-block border px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${isAdjustment ? 'bg-purple-100 text-purple-700 border-purple-200' : tagColor}`}>{m.tipo}</span></td>
                      <td className="px-4 py-3.5 font-bold text-gray-900">{m.cantidad}</td>
                      <td className="px-4 py-3.5 font-semibold text-gray-800 font-mono text-[12px]">{m.descripcion}</td>
                      <td className="px-4 py-3.5"><span className="inline-block bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-semibold">{m.unidad}</span></td>
                      <td className="px-4 py-3.5 text-gray-600 font-medium">{m.area}</td>
                      {user.module === 'COMPRAS' && (
                        <td className="px-4 py-3.5 text-[11px] leading-relaxed text-gray-500 whitespace-normal min-w-[200px]">
                          {m.tipo === 'ENTRADA' && !isAdjustment ? (
                            <div><div><b>Proveedor:</b> {m.prov || '-'}</div><div><b>Factura/Rem:</b> {m.fact || '-'} {m.fechaFact ? `(${formatearFecha(m.fechaFact)})` : ''}</div><div><b>Costo U:</b> ${m.costoUnit || '0'} (Total: ${m.costoTotal || '0'})</div><div><b>N° Aut:</b> {m.aut || '-'}</div></div>
                          ) : m.tipo === 'SALIDA' && !isAdjustment ? (
                            <div><div><b>Recibe:</b> {m.recibe || '-'}</div><div><b>Resp. Área:</b> {m.resp || '-'}</div></div>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                      )}
                      <td className="px-4 py-3.5 text-gray-500 max-w-[200px] truncate whitespace-normal">
                        {m.notas || ''}
                        {isRowDeleted && <div className="text-[10px] text-red-600 font-bold border-t border-red-200 pt-0.5 mt-1">🗑️ Anulado por: {m.eliminadoPor}</div>}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-gray-600">{m.registradoPor}</td>
                      <td className="px-4 py-3.5 text-center">
                        {!isRowDeleted ? (
                          <button onClick={() => onDeleteMovimiento(m.id)} title="Anular Movimiento" className="inline-flex items-center justify-center w-7 h-7 rounded bg-red-50 hover:bg-red-100 text-red-600 hover:border-red-350 border border-red-100 transition-all cursor-pointer">✕</button>
                        ) : <span className="text-xs font-mono text-red-500 font-bold uppercase">Anulado</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}