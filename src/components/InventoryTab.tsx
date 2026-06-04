import React, { useState } from 'react';
import { User } from '../types';
import { InventoryItem } from '../utils';
import { Search, Printer, Download, Scale, Trash } from 'lucide-react';
import * as XLSX from 'xlsx';

interface InventoryTabProps {
  user: User;
  inventory: InventoryItem[];
  onOpenAdjustment: (item: { descripcion: string; unidad: string }) => void;
  onDeleteProduct: (descripcion: string, unidad: string) => void;
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
  
  const isAdmin = user.role === 'admin' || user.role === 'admin_contable';
  const isConta = user.module === 'CONTABILIDAD';

  const filteredInventory = inventory.filter(item =>
    item.descripcion.toUpperCase().includes(searchTerm.trim().toUpperCase())
  );

  const lowStockThreshold = 10;
  const criticalItemsCount = inventory.filter(i => i.actual > 0 && i.actual <= lowStockThreshold).length;
  const totalStockItems = inventory.reduce((sum, i) => sum + i.actual, 0);

  const handleExportCSV = () => {
    if (inventory.length === 0) {
      showToast('No hay mercancías cargadas en el catálogo', 'error');
      return;
    }
    
    const dataToExport = inventory.map(i => {
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
    <div className="space-y-6">
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
            {inventory.length} Artículos
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
                              onClick={() => onDeleteProduct(item.descripcion, item.unidad)}
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
    </div>
  );
}