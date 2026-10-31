import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { formatMoney, formatDate } from '../../utils/format';
import {
  PageHeader,
  DataTable,
  Button,
  Input,
  Select,
  Modal,
  StatusBadge,
  useToast,
} from '../../components/ui';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Layers,
} from 'lucide-react';

export function ProductsPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const toast = useToast();

  // Products table state
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('');
  const [loading, setLoading] = useState(false);

  // Product Create/Edit Modal state
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    base_price: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Variants Modal state
  const [variantsModalOpen, setVariantsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [variantForm, setVariantForm] = useState({
    name: '',
    sku: '',
    price_adjustment: '0.00',
  });
  const [editingVariant, setEditingVariant] = useState(null);
  const [variantSubmitting, setVariantSubmitting] = useState(false);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
      };
      if (search) params.search = search;
      if (isActiveFilter !== '') params.is_active = isActiveFilter;

      const res = await api.get('/products', { params });
      setProducts(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, isActiveFilter, toast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handle open create product
  const handleOpenCreateProduct = () => {
    setEditingProduct(null);
    setProductForm({ name: '', description: '', base_price: '0.00' });
    setProductModalOpen(true);
  };

  // Handle open edit product
  const handleOpenEditProduct = (prod) => {
    setEditingProduct(prod);
    setProductForm({
      name: prod.name,
      description: prod.description || '',
      base_price: prod.base_price,
    });
    setProductModalOpen(true);
  };

  // Save product (POST or PUT)
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      const payload = {
        name: productForm.name,
        description: productForm.description,
        base_price: parseFloat(productForm.base_price || 0).toFixed(2),
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload);
        toast.success(`Product "${productForm.name}" updated`);
      } else {
        await api.post('/products', payload);
        toast.success(`Product "${productForm.name}" registered`);
      }

      setProductModalOpen(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to save product');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Soft-delete product
  const handleDeleteProduct = async (prod) => {
    if (!window.confirm(`Deactivate product "${prod.name}"?`)) return;
    try {
      await api.delete(`/products/${prod.id}`);
      toast.success(`Product "${prod.name}" deactivated`);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to deactivate product');
    }
  };

  // Open variants modal
  const handleOpenVariants = async (prod) => {
    setSelectedProduct(prod);
    setVariantsModalOpen(true);
    setEditingVariant(null);
    setVariantForm({ name: '', sku: '', price_adjustment: '0.00' });

    try {
      const res = await api.get(`/products/${prod.id}/variants`);
      setVariants(res.data || []);
    } catch {
      toast.error('Failed to load variants');
    }
  };

  // Save variant (POST or PUT)
  const handleSaveVariant = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setVariantSubmitting(true);

    try {
      const adj = parseFloat(variantForm.price_adjustment || 0).toFixed(2);
      const payload = {
        name: variantForm.name,
        sku: variantForm.sku,
        price_adjustment: adj,
      };

      if (editingVariant) {
        await api.put(`/variants/${editingVariant.id}`, payload);
        toast.success(`Variant "${variantForm.name}" updated`);
      } else {
        await api.post(`/products/${selectedProduct.id}/variants`, payload);
        toast.success(`Variant "${variantForm.name}" added`);
      }

      // Refresh variants list
      const res = await api.get(`/products/${selectedProduct.id}/variants`);
      setVariants(res.data || []);
      setEditingVariant(null);
      setVariantForm({ name: '', sku: '', price_adjustment: '0.00' });
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to save variant');
    } finally {
      setVariantSubmitting(false);
    }
  };

  // Soft delete variant
  const handleDeleteVariant = async (v) => {
    if (!window.confirm(`Deactivate variant "${v.name}"?`)) return;
    try {
      await api.delete(`/variants/${v.id}`);
      toast.success(`Variant "${v.name}" deactivated`);
      const res = await api.get(`/products/${selectedProduct.id}/variants`);
      setVariants(res.data || []);
    } catch (err) {
      toast.error('Failed to deactivate variant');
    }
  };

  // Columns definition
  const columns = [
    {
      key: 'name',
      header: 'PRODUCT SPECIFICATION',
      render: (_, row) => (
        <div className="flex flex-col">
          <span className="font-bold text-[#181e22]">{row.name}</span>
          <span className="text-[11px] text-[#55636c] truncate max-w-xs">{row.description}</span>
        </div>
      ),
    },
    {
      key: 'base_price',
      header: 'BASE RATE',
      render: (val) => (
        <span className="font-bold text-[#181e22] bg-[#d5dbde] px-2 py-0.5 rounded border border-[#9aa3a8]">
          {formatMoney(val)}
        </span>
      ),
    },
    {
      key: 'is_active',
      header: 'CHASSIS STATUS',
      render: (val) => <StatusBadge status={val ? 'active' : 'inactive'} />,
    },
    {
      key: 'created_at',
      header: 'RECORDED ON',
      render: (val) => formatDate(val),
    },
    {
      key: 'actions',
      header: 'CONTROLS',
      render: (_, row) => (
        <div className="flex items-center gap-1.5">
          <Button
            variant="raised"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenVariants(row);
            }}
            className="text-[11px] py-0.5 px-2"
          >
            <Layers className="w-3 h-3 mr-1 text-accent" />
            VARIANTS
          </Button>

          {isAdmin && (
            <>
              <Button
                variant="raised"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenEditProduct(row);
                }}
                className="text-[11px] py-0.5 px-2"
                aria-label="Edit product"
              >
                <Edit2 className="w-3 h-3 text-[#55636c]" />
              </Button>

              {row.is_active && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProduct(row);
                  }}
                  className="text-[11px] py-0.5 px-2"
                  aria-label="Deactivate product"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        bayNumber="BAY 02"
        title="Products & Hardware Matrix"
        subtitle="Catalog inventory, baseline pricing, and configurable hardware variants."
        status="CATALOG ONLINE"
        actions={
          isAdmin && (
            <Button
              variant="accent"
              indicator="green"
              onClick={handleOpenCreateProduct}
              className="text-xs font-bold"
            >
              <Plus className="w-4 h-4 mr-1" />
              REGISTER NEW PRODUCT
            </Button>
          )
        }
      />

      {/* Filter and Query Deck */}
      <div className="panel-well rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-2 border-[#9ba5aa]">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search products by title..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            icon={Search}
          />
        </div>

        <div className="w-full sm:w-52">
          <Select
            value={isActiveFilter}
            onChange={(e) => {
              setIsActiveFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">ALL STATUSES</option>
            <option value="true">ACTIVE ONLY</option>
            <option value="false">INACTIVE ONLY</option>
          </Select>
        </div>
      </div>

      {/* Products Matrix Table */}
      <DataTable
        columns={columns}
        data={products}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={(p) => setPage(p)}
        loading={loading}
        emptyTitle="NO PRODUCTS CATALOGED"
        emptyDescription="No products match the search query or active filter."
      />

      {/* Product Create/Edit Modal */}
      <Modal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        title={editingProduct ? 'Reconfigure Product' : 'Register New Product'}
        bayNumber="BAY CFG // CATALOG"
      >
        <form onSubmit={handleSaveProduct} className="flex flex-col gap-4">
          <Input
            label="PRODUCT NAME *"
            value={productForm.name}
            onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
            placeholder="e.g. Brightloop Telemetry Hub"
            required
            autoFocus
          />

          <Input
            label="BASE RATE (USD) *"
            type="number"
            step="0.01"
            value={productForm.base_price}
            onChange={(e) => setProductForm({ ...productForm, base_price: e.target.value })}
            placeholder="999.00"
            suffix="USD"
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="engraved-label">TECHNICAL SPECIFICATION / DESCRIPTION</label>
            <textarea
              className="w-full bg-[#f4f6f7] text-[#181e22] font-mono text-sm p-3 rounded-key border border-[#9aa3a8] shadow-well focus:bg-white focus:border-accent focus-visible:ring-2 focus-visible:ring-accent"
              rows={3}
              value={productForm.description}
              onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
              placeholder="Describe platform capabilities and technical limits..."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#b6bec2]">
            <Button variant="raised" onClick={() => setProductModalOpen(false)}>
              CANCEL
            </Button>
            <Button
              type="submit"
              variant="accent"
              indicator="orange"
              loading={formSubmitting}
            >
              {editingProduct ? 'COMMIT CHANGES' : 'INITIALIZE PRODUCT'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Product Variants Modal */}
      <Modal
        isOpen={variantsModalOpen}
        onClose={() => setVariantsModalOpen(false)}
        title={`Variants: ${selectedProduct?.name}`}
        bayNumber="BAY 02-B // VARIANTS"
        maxWidth="max-w-3xl"
      >
        <div className="flex flex-col gap-5">
          {/* Base Product Info Banner */}
          <div className="panel-screen rounded p-3 flex items-center justify-between font-mono text-xs">
            <div>
              <span className="text-[#9aa3a8] block text-[10px]">BASE HARDWARE PRICE</span>
              <span className="text-accent font-bold text-base">
                {formatMoney(selectedProduct?.base_price)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[#9aa3a8] block text-[10px]">TOTAL CONFIGURED VARIANTS</span>
              <span className="text-white font-bold">{variants.length} SKU(S)</span>
            </div>
          </div>

          {/* Add / Edit Variant Form (Admin Only) */}
          {isAdmin && (
            <div className="panel-well rounded-md p-4 border border-[#9aa3a8]">
              <div className="flex items-center gap-2 mb-3">
                <span className="led-lamp led-orange" />
                <span className="engraved-label text-xs">
                  {editingVariant ? 'MODIFY VARIANT SPEC' : 'ADD NEW VARIANT / SKU'}
                </span>
              </div>

              <form onSubmit={handleSaveVariant} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="VARIANT NAME *"
                  value={variantForm.name}
                  onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
                  placeholder="e.g. Enterprise Matrix"
                  required
                />

                <Input
                  label="SKU IDENTIFIER *"
                  value={variantForm.sku}
                  onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })}
                  placeholder="e.g. CRM-ENT-01"
                  required
                />

                <Input
                  label="PRICE ADJUSTMENT *"
                  type="number"
                  step="0.01"
                  value={variantForm.price_adjustment}
                  onChange={(e) => setVariantForm({ ...variantForm, price_adjustment: e.target.value })}
                  placeholder="500.00"
                  suffix="USD"
                  hint={`Effective: ${formatMoney(
                    (parseFloat(selectedProduct?.base_price || 0) + parseFloat(variantForm.price_adjustment || 0)).toFixed(2)
                  )}`}
                  required
                />

                <div className="sm:col-span-3 flex justify-end gap-2 pt-2">
                  {editingVariant && (
                    <Button
                      variant="raised"
                      size="sm"
                      onClick={() => {
                        setEditingVariant(null);
                        setVariantForm({ name: '', sku: '', price_adjustment: '0.00' });
                      }}
                    >
                      CANCEL EDIT
                    </Button>
                  )}
                  <Button
                    type="submit"
                    variant="accent"
                    size="sm"
                    indicator="orange"
                    loading={variantSubmitting}
                  >
                    {editingVariant ? 'UPDATE VARIANT' : 'ADD VARIANT'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Variants List Table */}
          <div className="overflow-x-auto rounded border border-[#9aa3a8] bg-[#f4f6f7]">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-[#b6bec2] border-b border-[#8b969c]">
                <tr>
                  <th className="px-3 py-2 font-bold text-[#181e22]">VARIANT</th>
                  <th className="px-3 py-2 font-bold text-[#181e22]">SKU</th>
                  <th className="px-3 py-2 font-bold text-[#181e22]">ADJUSTMENT</th>
                  <th className="px-3 py-2 font-bold text-[#181e22]">EFFECTIVE PRICE</th>
                  <th className="px-3 py-2 font-bold text-[#181e22]">STATUS</th>
                  {isAdmin && <th className="px-3 py-2 font-bold text-[#181e22]">CONTROLS</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c2c9cc]">
                {variants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-6 text-[#55636c]">
                      No variants registered for this product yet.
                    </td>
                  </tr>
                ) : (
                  variants.map((v) => (
                    <tr key={v.id} className="hover:bg-[#e7eaeb]">
                      <td className="px-3 py-2.5 font-bold text-[#181e22]">{v.name}</td>
                      <td className="px-3 py-2.5 text-[#55636c]">
                        <span className="bg-[#cbd0d2] px-1.5 py-0.5 rounded border border-[#9aa3a8]">
                          {v.sku}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {parseFloat(v.price_adjustment) >= 0 ? '+' : ''}
                        {formatMoney(v.price_adjustment)}
                      </td>
                      <td className="px-3 py-2.5 font-bold text-accent">
                        {formatMoney(v.effective_price)}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={v.is_active ? 'active' : 'inactive'} />
                      </td>
                      {isAdmin && (
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingVariant(v);
                                setVariantForm({
                                  name: v.name,
                                  sku: v.sku,
                                  price_adjustment: v.price_adjustment,
                                });
                              }}
                              className="p-1 text-[#55636c] hover:text-[#181e22]"
                              aria-label="Edit variant"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {v.is_active && (
                              <button
                                onClick={() => handleDeleteVariant(v)}
                                className="p-1 text-red-600 hover:text-red-800"
                                aria-label="Deactivate variant"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default ProductsPage;
