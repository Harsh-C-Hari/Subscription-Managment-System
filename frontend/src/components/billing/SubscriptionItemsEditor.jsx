import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Input, Select } from '../ui';
import { formatMoney } from '../../utils/format';

export function SubscriptionItemsEditor({
  items = [],
  onChange,
  products = [],
  readOnly = false,
}) {
  const handleAddItem = () => {
    const firstProduct = products[0];
    const newItem = {
      product_id: firstProduct?.id || '',
      variant_id: null,
      description: firstProduct?.name || 'Standard Service Provisioning',
      quantity: 1,
      unit_price: firstProduct?.base_price || '99.00',
    };
    onChange([...items, newItem]);
  };

  const handleRemoveItem = (index) => {
    const next = items.filter((_, i) => i !== index);
    onChange(next);
  };

  const handleChangeField = (index, field, value) => {
    const next = items.map((item, i) => {
      if (i !== index) return item;

      if (field === 'product_id') {
        const prod = products.find((p) => p.id === value);
        return {
          ...item,
          product_id: value,
          description: prod ? prod.name : item.description,
          unit_price: prod?.base_price || item.unit_price,
        };
      }

      return { ...item, [field]: value };
    });
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          <h5 className="font-mono text-xs font-bold text-[#181e22] tracking-wider uppercase">
            Provisioned Line Items ({items.length})
          </h5>
        </div>
        {!readOnly && (
          <Button
            variant="raised"
            size="sm"
            onClick={handleAddItem}
            className="text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1 text-accent" />
            ADD LINE ITEM
          </Button>
        )}
      </div>

      <div className="rounded border border-[#9aa3a8] bg-[#e7eaeb] overflow-hidden shadow-well">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#b6bec2] text-[#181e22] border-b border-[#9aa3a8]">
            <tr>
              <th className="py-2 px-3 font-bold uppercase tracking-wider">Product / Item</th>
              <th className="py-2 px-3 font-bold uppercase tracking-wider">Description</th>
              <th className="py-2 px-3 font-bold uppercase tracking-wider w-24">Qty</th>
              <th className="py-2 px-3 font-bold uppercase tracking-wider w-32">Unit Price</th>
              <th className="py-2 px-3 font-bold uppercase tracking-wider w-32 text-right">Estimate</th>
              {!readOnly && <th className="py-2 px-2 w-10 text-center"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#c2c9cc] bg-[#f4f6f7]">
            {items.length === 0 ? (
              <tr>
                <td colSpan={readOnly ? 5 : 6} className="py-6 text-center text-[#55636c]">
                  No items configured. Add at least one provisioned item or select a plan template.
                </td>
              </tr>
            ) : (
              items.map((item, index) => {
                const qty = parseInt(item.quantity, 10) || 0;
                const price = parseFloat(item.unit_price) || 0;
                const estTotal = (qty * price).toFixed(2);

                return (
                  <tr key={index} className="hover:bg-white transition-colors">
                    <td className="p-2">
                      {readOnly ? (
                        <span className="font-semibold text-[#181e22]">
                          {products.find((p) => p.id === item.product_id)?.name || item.product_id}
                        </span>
                      ) : (
                        <select
                          value={item.product_id || ''}
                          onChange={(e) => handleChangeField(index, 'product_id', e.target.value)}
                          className="w-full bg-white text-[#181e22] font-mono text-xs px-2 py-1 rounded border border-[#9aa3a8] focus:border-accent focus:ring-1 focus:ring-accent"
                        >
                          <option value="">-- Select Product --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>

                    <td className="p-2">
                      {readOnly ? (
                        <span className="text-[#414b52]">{item.description}</span>
                      ) : (
                        <input
                          type="text"
                          value={item.description || ''}
                          onChange={(e) => handleChangeField(index, 'description', e.target.value)}
                          placeholder="Line item description"
                          className="w-full bg-white text-[#181e22] font-mono text-xs px-2 py-1 rounded border border-[#9aa3a8] focus:border-accent focus:ring-1 focus:ring-accent"
                        />
                      )}
                    </td>

                    <td className="p-2">
                      {readOnly ? (
                        <span className="font-bold">{item.quantity}</span>
                      ) : (
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => handleChangeField(index, 'quantity', e.target.value)}
                          className="w-full bg-white text-[#181e22] font-mono text-xs px-2 py-1 rounded border border-[#9aa3a8] focus:border-accent focus:ring-1 focus:ring-accent text-center"
                        />
                      )}
                    </td>

                    <td className="p-2">
                      {readOnly ? (
                        <span>{formatMoney(item.unit_price)}</span>
                      ) : (
                        <input
                          type="text"
                          value={item.unit_price || ''}
                          onChange={(e) => handleChangeField(index, 'unit_price', e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-white text-[#181e22] font-mono text-xs px-2 py-1 rounded border border-[#9aa3a8] focus:border-accent focus:ring-1 focus:ring-accent text-right"
                        />
                      )}
                    </td>

                    <td className="p-2 text-right font-bold text-[#181e22]">
                      {formatMoney(item.line_total || estTotal)}
                    </td>

                    {!readOnly && (
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="text-[#55636c] hover:text-red-600 p-1 transition-colors"
                          title="Remove row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SubscriptionItemsEditor;
