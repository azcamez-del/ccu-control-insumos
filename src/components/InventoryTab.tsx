import React, { useState } from 'react';
import { User } from '../types';
import { InventoryItem } from '../utils';
import { Search, Printer, Download, Scale, Trash, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface InventoryTabProps {
  user: User;
  inventory: InventoryItem[];
  onOpenAdjustment: (item: { descripcion: string; unidad: string }) => void;
  // ACTUALIZACIÓN: Ahora recibe actualStock para saber cuánto liquidar
  onDeleteProduct: (descripcion: string, unidad: string, actualStock: number) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warn' | 'info') => void;
}

export default function InventoryTab({
  user,
  inventory,
  onOpenAdjustment,
  onDeleteProduct,
  showToast
}: InventoryTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // NUEVO ESTADO: Controla la ventana de advertencia de borrado
  const [deleteAlert, setDeleteAlert] = useState<{isOpen: boolean, item: InventoryItem | null}>({isOpen: false, item: null});

  const isAdmin = user.role === 'admin' || user.role === 'admin_contable';
  const isConta = user.module === 'CONTABILIDAD';

  // FILTRO INTELIGENTE: Ignora los productos que el admin ya eliminó
  const validInventory = inventory.filter(item =>
    !item.notasEliminacion || !item.notasEliminacion.startsWith('[AUDITORÍA]: PRODUCTO ELIMINADO')
  );

  const filteredInventory = validInventory.filter(item =>
    item.descripcion.toUpperCase().includes(searchTerm.trim().toUpperCase())
  );

  const lowStockThreshold = 10;
  // ACTUALIZACIÓN: Los contadores ahora solo suman el inventario válido
  const criticalItemsCount = validInventory.filter(i => i.actual > 0 && i.actual <= lowStockThreshold).length;
  const totalStockItems = validInventory.reduce((sum, i) => sum + i.actual, 0);

  // NUEVA FUNCIÓN: Ejecuta el borrado después de confirmar en la alerta
  const confirmDelete = () => {
    if (deleteAlert.item) {
      onDeleteProduct(deleteAlert.item.descripcion, deleteAlert.item.unidad, deleteAlert.item.actual);
      setDeleteAlert({isOpen: false, item: null});
    }
  };

  const handleExportCSV = () => {
    if (validInventory.length === 0) {
      showToast('No hay mercancías cargadas en el catálogo', 'error');
      return;
    }
    
    const dataToExport = validInventory.map(i => {
      const base: any = {
        'ARTÍCULO / CONCEPTO': i.descripcion,
        'MEDIDA / UNIDAD': i.unidad,
        'CATEGORÍA / TIPO': i.tipoCompra || 'RESURTIBLE',
      };
      
      if (isConta) {
        base['TOTAL INGRESADO (U)'] = i.entradas;
        base['SALIDAS REGISTRADAS'] = i.salidas;
        base['ACTIVOS EN EMPRESA'] = i.actual;
      } else {
        base['VOLUMEN ENTRADAS'] = i.entradas;
        base['VOLUMEN SALIDAS'] = i.salidas;
        base['EXISTENCIA ACTUAL'] = i.actual;
      }
      return base;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, isConta ? "Libro_Activos" : "Inventario_Actual");
    XLSX.writeFile(workbook, `CCU_${isConta ? 'Libro_Activos' : 'Catalogo_Stocks'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('Documento generado exitosamente', 'success');
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#ddd9d0] gap-4">
        <div>
          <h2 className={`text-xl md:text-2xl font-bold font-sans ${isConta ? 'text-amber-800' : 'text-gray-900'}`}>
            {isConta ? 'Libro Contable de Activos y Conceptos' : 'Inventario Actual (Catálogo General)'}
          </h2>
          <p className="text-xs md:text-sm text-gray-500 mt-1">
            {isConta ? 'Registro consolidado de bienes patrimoniales y servicios recurrentes.' : 'Balance en tiempo real de entradas y salidas. El sistema avisa si el stock es bajo.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => window.print()}
            className="btn btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-50 text-gray-600 border border-gray-300 hover:bg-gray-100 cursor-pointer print:hidden"
          >
            <Printer size={14} />
            Imprimir
          </button>
          <button
            onClick={handleExportCSV}
            className={`btn btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer print:hidden ${isConta ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}`}
          >
            <Download size={14} />
            Exportar Excel Oficial
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3">
        <div className="bg-white border border-[#ddd9d0] rounded-xl p-5 shadow-sm">
          <div className="text-[10px] md:text-xs font-bold text-gray-500 tracking-wider uppercase mb-1">
            {isConta ? 'Total de Conceptos' : 'Catálogo General'}
          </div>
          <div className="text-2xl md:text-3xl font-bold font-mono text-gray-800">
            {validInventory.length} Artículos
          </div>
        </div>

        <div className="bg-white border border-[#ddd9d0] rounded-xl p-5 shadow-sm">
          <div className="text-[10px] md:text-xs font-bold text-gray-500 tracking-wider uppercase mb-1">
            {isConta ? 'Bienes Activos Netos' : 'Stock Físico Neto'}
          </div>
          <div className="text-2xl md:text-3xl font-bold font-mono text-blue-600">
            {totalStockItems} U.
          </div>
        </div>

        {!isConta && (
          <div className="bg-white border border-[#ddd9d0] rounded-xl p-5 shadow-sm">
            <div className="text-[10px] md:text-xs font-bold text-gray-500 tracking-wider uppercase mb-1">
              Puntos Críticos (Stock Bajo)
            </div>
            <div className={`text-2xl md:text-3xl font-bold font-mono ${criticalItemsCount > 0 ? 'text-red-600' : 'text-gray-800'}`}>
              {criticalItemsCount}
            </div>
          </div>
        )}
      </div>

      <div className="relative flex items-center bg-white border border-[#ddd9d0] rounded-xl px-3 py-2 shadow-sm focus-within:border-blue-600 transition-colors print:hidden">
        <Search size={16} className="text-gray-400 mr-2.5 flex-shrink-0" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={isConta ? "Buscar concepto o artículo..." : "Buscar producto en el inventario actual..."}
          className="w-full text-xs md:text-sm text-gray-900 bg-white focus:outline-none uppercase"
        />
      </div>

      <div className="bg-white border border-[#ddd9d0] rounded-xl shadow-sm overflow-hidden">
        {filteredInventory.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm md:text-base font-semibold">No se encontraron artículos en el catálogo.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs md:text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-[#ddd9d0] font-sans font-bold text-[10px] md:text-xs text-gray-500 tracking-wider uppercase">
                  <th className="px-5 py-3.5">{isConta ? 'Concepto / Artículo Registrado' : 'Descripción del Artículo'}</th>
                  <th className="px-5 py-3.5">Unidad</th>
                  <th className="px-5 py-3.5 text-right">{isConta ? 'Ingresados' : 'Entradas'}</th>
                  <th className="px-5 py-3.5 text-right">{isConta ? 'Asignados' : 'Salidas'}</th>
                  <th className="px-5 py-3.5 text-right text-blue-600 font-bold">{isConta ? 'Activo Fijo' : 'Stock Actual'}</th>
                  {!isConta && <th className="px-5 py-3.5 text-center">Alerta</th>}
                  {isAdmin && <th className="px-5 py-3.5 text-center print:hidden">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ddd9d0] whitespace-nowrap">
                {filteredInventory.map((item, idx) => {
                  let alertTag = (
                    <span className="inline-block bg-green-50 text-green-700 border border-green-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      Estable
                    </span>
                  );
                  if (item.actual === 0) {
                    alertTag = (
                      <span className="inline-block bg-gray-100 text-gray-600 border border-gray-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        Agotado
                      </span>
                    );
                  } else if (item.actual <= lowStockThreshold) {
                    alertTag = (
                      <span className="inline-block bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        Stock Bajo
                      </span>
                    );
                  }

                  return (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-gray-900 border-r border-gray-50">
                        {item.descripcion}
                        <div className="mt-1 font-sans">
                          {isConta ? (
                            <span className="bg-amber-100 text-amber-800 border border-amber-200 font-bold px-1.5 py-0.2 rounded text-[8px] uppercase tracking-wider">
                              {item.tipoCompra || 'CATEGORÍA PENDIENTE'}
                            </span>
                          ) : (
                            item.tipoCompra === 'UNICA' ? (
                              <span className="bg-purple-100 text-purple-700 border border-purple-200 font-bold px-1.5 py-0.2 rounded text-[8px] uppercase tracking-wider">
                                COMPRA ÚNICA
                              </span>
                            ) : (
                              <span className="bg-cyan-100 text-cyan-700 border border-cyan-200 font-bold px-1.5 py-0.2 rounded text-[8px] uppercase tracking-wider">
                                RESURTIBLE REGULAR
                              </span>
                            )
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="inline-block bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded text-[10px] uppercase font-mono">
                          {item.unidad}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right text-emerald-600 font-semibold">
                        +{item.entradas}
                      </td>

                      <td className="px-5 py-3.5 text-right text-red-650 font-semibold text-red-600">
                        -{item.salidas}
                      </td>

                      <td className="px-5 py-3.5 text-right font-bold text-sm md:text-base font-mono bg-blue-50/20 text-gray-900">
                        {item.actual}
                      </td>

                      {!isConta && (
                        <td className="px-5 py-3.5 text-center">
                          {alertTag}
                        </td>
                      )}

                      {isAdmin && (
                        <td className="px-5 py-3.5 text-center print:hidden">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => onOpenAdjustment({ descripcion: item.descripcion, unidad: item.unidad })}
                              className="btn btn-secondary inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md text-gray-750 bg-[#f5f3ee] hover:bg-gray-200 border border-[#ddd9d0] cursor-pointer"
                            >
                              <Scale size={12} />
                              Ajuste
                            </button>
                            <button
                              onClick={() => setDeleteAlert({isOpen: true, item: item})}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 cursor-pointer transition-colors"
                              title="Eliminar del catálogo maestro"
                            >
                              <Trash size={12} />
                              Borrar
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PANTALLA DE ALERTA DE ELIMINACIÓN */}
      {deleteAlert.isOpen && deleteAlert.item && (
        <div className="fixed inset-0 bg-[#1a1814]/60 backdrop-blur-xs flex items-center justify-center p-4 z-100 transition-opacity print:hidden">
          <div className="bg-white rounded-xl max-w-[450px] w-full p-6 shadow-2xl border border-red-200 space-y-5">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                <AlertTriangle size={20} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Advertencia de Eliminación</h3>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Estás a punto de eliminar el producto <strong className="text-gray-900">{deleteAlert.item.descripcion}</strong> de la vista del inventario.
              </p>
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex flex-col gap-1">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">Consecuencias de esta acción:</span>
                <ul className="text-xs text-amber-700 list-disc list-inside space-y-1">
                  <li>El producto desaparecerá de las listas.</li>
                  <li>Se generará un <strong>Ajuste de Salida automático</strong> por <strong>{deleteAlert.item.actual} unidades</strong> para liquidar su stock.</li>
                  <li>Esta acción quedará registrada en el Historial para revisión de los auditores.</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setDeleteAlert({isOpen: false, item: null})} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-lg cursor-pointer transition-colors">
                Cancelar
              </button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg shadow-md cursor-pointer transition-colors">
                Sí, Eliminar Producto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}