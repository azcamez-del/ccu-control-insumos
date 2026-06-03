import React, { useState } from 'react';
import { User } from '../types';
import { Search, Plus, Trash2 } from 'lucide-react';

interface AreasTabProps {
  user: User;
  areas: string[];
  proveedores: string[];
  unidades: string[]; // <-- NUEVA PROP
  onAddArea: (area: string) => void;
  onRemoveArea: (area: string) => void;
  onAddProv: (prov: string) => void;
  onRemoveProv: (prov: string) => void;
  onAddUnidad: (unidad: string) => void; // <-- NUEVA PROP
  onRemoveUnidad: (unidad: string) => void; // <-- NUEVA PROP
  showToast: (msg: string, type?: 'success' | 'error' | 'warn' | 'info') => void;
}

export default function AreasTab({
  user, areas, proveedores, unidades, onAddArea, onRemoveArea, onAddProv, onRemoveProv, onAddUnidad, onRemoveUnidad, showToast
}: AreasTabProps) {
  const [newArea, setNewArea] = useState('');
  const [newProv, setNewProv] = useState('');
  const [newUnidad, setNewUnidad] = useState('');
  const [searchArea, setSearchArea] = useState('');
  const [searchProv, setSearchProv] = useState('');
  const [searchUnidad, setSearchUnidad] = useState('');

  const showProveedores = user.module === 'COMPRAS' || user.module === 'CONTABILIDAD';
  const isConta = user.module === 'CONTABILIDAD';
  // Candado para que solo jefaturas de Compras puedan agregar Unidades:
  const showUnidades = user.module === 'COMPRAS' && (user.role === 'admin' || user.role === 'supervisor');

  const handleAddAreaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newArea.trim().toUpperCase();
    if (!val) return;
    if (areas.includes(val)) { showToast('Esa área ya se encuentra registrada', 'warn'); return; }
    onAddArea(val); setNewArea(''); showToast('Área ingresada al catálogo correctamente', 'success');
  };

  const handleAddProvSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newProv.trim().toUpperCase();
    if (!val) return;
    if (proveedores.includes(val)) { showToast('El proveedor ya existe', 'warn'); return; }
    onAddProv(val); setNewProv(''); showToast('Proveedor ingresado', 'success');
  };

  const handleAddUnidadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newUnidad.trim().toUpperCase();
    if (!val) return;
    if (unidades.includes(val)) { showToast('La unidad de medida ya existe', 'warn'); return; }
    onAddUnidad(val); setNewUnidad(''); showToast('Unidad agregada correctamente', 'success');
  };

  const filteredAreas = areas.filter(a => a.toUpperCase().includes(searchArea.trim().toUpperCase())).sort();
  const filteredProvs = proveedores.filter(p => p.toUpperCase().includes(searchProv.trim().toUpperCase())).sort();
  const filteredUnidades = unidades.filter(u => u.toUpperCase().includes(searchUnidad.trim().toUpperCase())).sort();

  return (
    <div className="space-y-6">
      <div className="page-header pb-4 border-b border-[#ddd9d0]">
        <h2 className="text-xl md:text-2xl font-bold font-sans text-gray-900">
          {isConta ? 'Proveedores y Áreas CCU' : showProveedores ? 'Gestión de Catálogos (Áreas y Proveedores)' : 'Gestión de Catálogo de Áreas'}
        </h2>
        <p className="text-xs md:text-sm text-gray-500 mt-1">Administre los catálogos base para autocompletar rápidamente los formularios de registro</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ÁREAS CARD */}
        <div className="bg-white border border-[#ddd9d0] rounded-xl p-5 md:p-6 shadow-sm space-y-4">
          <h3 className="text-sm md:text-base font-bold text-gray-800 tracking-wide uppercase border-b border-gray-100 pb-2">Catálogo de Áreas / Centros de Costo</h3>
          <form onSubmit={handleAddAreaSubmit} className="flex gap-2">
            <input type="text" value={newArea} onChange={(e) => setNewArea(e.target.value)} placeholder="Ej. DIRECCIÓN CCU" className="flex-1 border-1.5 border-[#ddd9d0] rounded-lg px-3 py-2 text-xs focus:border-blue-600 focus:outline-none uppercase" />
            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow cursor-pointer"><Plus size={14} />Agregar</button>
          </form>
          <div className="relative flex items-center border border-[#ddd9d0] rounded-lg px-2 py-1.5 bg-gray-50 focus-within:bg-white focus-within:border-blue-600">
            <Search size={14} className="text-gray-400 mr-2" />
            <input type="text" value={searchArea} onChange={(e) => setSearchArea(e.target.value)} placeholder="Buscar Área..." className="w-full text-xs bg-transparent focus:outline-none uppercase" />
          </div>
          <div className="max-h-60 overflow-y-auto border border-[#ddd9d0] rounded-lg">
            <table className="w-full border-collapse text-left text-xs">
              <tbody className="divide-y divide-gray-150">
                {filteredAreas.map((area) => (
                  <tr key={area} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-semibold text-gray-800 uppercase">{area}</td>
                    <td className="px-4 py-2 text-center w-12"><button onClick={() => { if (confirm(`¿Retirar "${area}"?`)) { onRemoveArea(area); } }} className="text-red-500 hover:text-red-700"><Trash2 size={13} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* PROVEEDORES CARD */}
        {showProveedores && (
          <div className="bg-white border border-[#ddd9d0] rounded-xl p-5 md:p-6 shadow-sm space-y-4">
            <h3 className="text-sm md:text-base font-bold text-gray-800 tracking-wide uppercase border-b border-gray-100 pb-2">Catálogo de Proveedores</h3>
            <form onSubmit={handleAddProvSubmit} className="flex gap-2">
              <input type="text" value={newProv} onChange={(e) => setNewProv(e.target.value)} placeholder="Ej. OFFICE DEPOT" className="flex-1 border-1.5 border-[#ddd9d0] rounded-lg px-3 py-2 text-xs focus:border-blue-600 focus:outline-none uppercase" />
              <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow cursor-pointer"><Plus size={14} />Agregar</button>
            </form>
            <div className="relative flex items-center border border-[#ddd9d0] rounded-lg px-2 py-1.5 bg-gray-50 focus-within:bg-white focus-within:border-blue-600">
              <Search size={14} className="text-gray-400 mr-2" />
              <input type="text" value={searchProv} onChange={(e) => setSearchProv(e.target.value)} placeholder="Buscar Proveedor..." className="w-full text-xs bg-transparent focus:outline-none uppercase" />
            </div>
            <div className="max-h-60 overflow-y-auto border border-[#ddd9d0] rounded-lg">
              <table className="w-full border-collapse text-left text-xs">
                <tbody className="divide-y divide-gray-150">
                  {filteredProvs.map((prov) => (
                    <tr key={prov} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-semibold text-gray-800 uppercase">{prov}</td>
                      <td className="px-4 py-2 text-center w-12"><button onClick={() => { if (confirm(`¿Retirar "${prov}"?`)) { onRemoveProv(prov); } }} className="text-red-500 hover:text-red-700"><Trash2 size={13} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* UNIDADES DE MEDIDA CARD (NUEVA - SOLO COMPRAS Y JEFATURAS) */}
        {showUnidades && (
          <div className="bg-white border border-[#ddd9d0] rounded-xl p-5 md:p-6 shadow-sm space-y-4 md:col-span-2 lg:col-span-1">
            <h3 className="text-sm md:text-base font-bold text-gray-800 tracking-wide uppercase border-b border-gray-100 pb-2 text-emerald-800">Catálogo de Unidades de Medida</h3>
            <p className="text-[10px] text-gray-500">Solo visible para jefaturas. Agregue unidades personalizadas (ej. BOTE, BOLSA) para sus formularios.</p>
            <form onSubmit={handleAddUnidadSubmit} className="flex gap-2">
              <input type="text" value={newUnidad} onChange={(e) => setNewUnidad(e.target.value)} placeholder="Ej. BOLSA 5KG" className="flex-1 border-1.5 border-emerald-200 rounded-lg px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none uppercase" />
              <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow cursor-pointer"><Plus size={14} />Agregar</button>
            </form>
            <div className="relative flex items-center border border-[#ddd9d0] rounded-lg px-2 py-1.5 bg-gray-50 focus-within:bg-white focus-within:border-emerald-600">
              <Search size={14} className="text-gray-400 mr-2" />
              <input type="text" value={searchUnidad} onChange={(e) => setSearchUnidad(e.target.value)} placeholder="Buscar Unidad..." className="w-full text-xs bg-transparent focus:outline-none uppercase" />
            </div>
            <div className="max-h-60 overflow-y-auto border border-[#ddd9d0] rounded-lg">
              <table className="w-full border-collapse text-left text-xs">
                <tbody className="divide-y divide-gray-150">
                  {filteredUnidades.map((unidad) => (
                    <tr key={unidad} className="hover:bg-emerald-50">
                      <td className="px-4 py-2 font-semibold text-gray-800 uppercase">{unidad}</td>
                      <td className="px-4 py-2 text-center w-12"><button onClick={() => { if (confirm(`¿Retirar unidad "${unidad}"?`)) { onRemoveUnidad(unidad); } }} className="text-red-500 hover:text-red-700"><Trash2 size={13} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}