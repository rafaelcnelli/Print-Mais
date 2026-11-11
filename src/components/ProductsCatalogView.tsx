import React, { useMemo, useRef, useState } from 'react';
import {
  PrintTechnology,
  ProductCategoryRecord,
  ProductRecord,
} from '../types';
import { formatCurrencyBRL } from '../utils/pricing';
import {
  compressImageFileToDataUrl,
  createSvgProductPreviewDataUrl,
} from '../utils/imageHelpers';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import {
  Camera,
  CheckCircle2,
  Edit3,
  FolderPlus,
  Image as ImageIcon,
  Layers,
  Package,
  PackagePlus,
  Plus,
  Search,
  Tag,
  Trash2,
  Upload,
  X,
  Zap,
} from 'lucide-react';

interface ProductsCatalogViewProps {
  products: ProductRecord[];
  categories: ProductCategoryRecord[];
  onCreateCategory: (
    categoryInput: Omit<ProductCategoryRecord, 'id' | 'ownerId' | 'createdAtIso'>
  ) => void;
  onDeleteCategory: (categoryId: string) => void;
  onCreateProduct: (
    productInput: Omit<ProductRecord, 'id' | 'ownerId' | 'createdAtIso'>
  ) => ProductRecord | Promise<ProductRecord>;
  onUpdateProduct: (updatedProduct: ProductRecord) => void | Promise<void>;
  onDeleteProduct: (productId: string) => void;
  onNavigateToOrdersWithProduct?: (product: ProductRecord) => void;
}

const CATEGORY_COLORS = [
  { label: 'Azul Royal', hex: '#1D63FF' },
  { label: 'Verde Esmeralda', hex: '#10B981' },
  { label: 'Violeta', hex: '#8B5CF6' },
  { label: 'Âmbar', hex: '#F59E0B' },
  { label: 'Ciano', hex: '#06B6D4' },
  { label: 'Rosa', hex: '#EC4899' },
];

export const ProductsCatalogView: React.FC<ProductsCatalogViewProps> = ({
  products,
  categories,
  onCreateCategory,
  onDeleteCategory,
  onCreateProduct,
  onUpdateProduct,
  onDeleteProduct,
  onNavigateToOrdersWithProduct,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toast, setToast] = useState<string | null>(null);

  // Category creation state
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatDesc, setNewCatDesc] = useState<string>('');
  const [newCatColor, setNewCatColor] = useState<string>('#1D63FF');
  const [catError, setCatError] = useState<string | null>(null);

  // Product Create / Edit Modal state
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null);
  const [categoryToDelete, setCategoryToDelete] =
    useState<ProductCategoryRecord | null>(null);
  const [productToDelete, setProductToDelete] = useState<ProductRecord | null>(
    null
  );

  // Product form fields
  const [prodName, setProdName] = useState<string>('');
  const [prodSku, setProdSku] = useState<string>('');
  const [prodCategory, setProdCategory] = useState<string>(
    categories[0]?.name || 'Peça Técnica'
  );
  const [prodTech, setProdTech] = useState<PrintTechnology>('FDM');
  const [prodWeight, setProdWeight] = useState<string>('80');
  const [prodHours, setProdHours] = useState<string>('2');
  const [prodMinutes, setProdMinutes] = useState<string>('30');
  const [prodFilamentPrice, setProdFilamentPrice] = useState<string>('130');
  const [prodUnitCost, setProdUnitCost] = useState<string>('18.50');
  const [prodUnitPrice, setProdUnitPrice] = useState<string>('39.90');
  const [prodStock, setProdStock] = useState<string>('10');
  const [prodDesc, setProdDesc] = useState<string>('');
  const [prodImageUrl, setProdImageUrl] = useState<string>('');
  const [prodFormError, setProdFormError] = useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState<boolean>(false);

  // Refs for Mobile Camera and File Upload
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3600);
  };

  // All available category names (combining registered categories + any category strings on products)
  const allCategoryNames = useMemo(() => {
    const set = new Set<string>();
    categories.forEach((c) => set.add(c.name));
    products.forEach((p) => {
      if (p.category?.trim()) set.add(p.category.trim());
    });
    return Array.from(set);
  }, [categories, products]);

  // Filtered products based on selected category and search query
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = p.sku.toLowerCase().includes(q);
        const matchCat = p.category.toLowerCase().includes(q);
        const matchDesc = (p.description || '').toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchCat && !matchDesc) return false;
      }
      return true;
    });
  }, [products, selectedCategory, searchQuery]);

  const handleOpenCreateProductModal = () => {
    setEditingProduct(null);
    setProdName('');
    setProdSku(`PRD-${String(products.length + 1).padStart(3, '0')}`);
    setProdCategory(
      selectedCategory !== 'all'
        ? selectedCategory
        : categories[0]?.name || 'Peça Técnica'
    );
    setProdTech('FDM');
    setProdWeight('85');
    setProdHours('2');
    setProdMinutes('30');
    setProdFilamentPrice('135');
    setProdUnitCost('19.50');
    setProdUnitPrice('42.90');
    setProdStock('10');
    setProdDesc('');
    setProdImageUrl('');
    setProdFormError(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProductModal = (product: ProductRecord) => {
    setEditingProduct(product);
    setProdName(product.name);
    setProdSku(product.sku);
    setProdCategory(product.category || categories[0]?.name || 'Peça Técnica');
    setProdTech(product.technology);
    setProdWeight(String(product.weightGrams));
    setProdHours(String(product.printTimeHours));
    setProdMinutes(String(product.printTimeMinutes));
    setProdFilamentPrice(String(product.filamentPricePerKg));
    setProdUnitCost(String(product.unitCost));
    setProdUnitPrice(String(product.unitPrice));
    setProdStock(String(product.stockQuantity));
    setProdDesc(product.description || '');
    setProdImageUrl(product.imageUrl || '');
    setProdFormError(null);
    setIsProductModalOpen(true);
  };

  const handlePhotoFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsProcessingPhoto(true);
      const compressedDataUrl = await compressImageFileToDataUrl(file);
      setProdImageUrl(compressedDataUrl);
      setProdFormError(null);
    } catch {
      setProdFormError('Não foi possível processar a foto selecionada.');
    } finally {
      setIsProcessingPhoto(false);
      e.target.value = '';
    }
  };

  const handleCreateCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) {
      setCatError('Informe o nome da categoria.');
      return;
    }
    if (
      allCategoryNames.some((c) => c.toLowerCase() === trimmed.toLowerCase())
    ) {
      setCatError('Já existe uma categoria com este nome.');
      return;
    }
    onCreateCategory({
      name: trimmed,
      description: newCatDesc.trim() || `Produtos da linha ${trimmed}`,
      colorHex: newCatColor,
    });
    setNewCatName('');
    setNewCatDesc('');
    setCatError(null);
    setIsCategoryFormOpen(false);
    setSelectedCategory(trimmed);
    showToast(`Categoria "${trimmed}" criada com sucesso!`);
  };

  const handleSaveProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = prodName.trim();
    const trimmedSku = prodSku.trim().toUpperCase();
    if (!trimmedName) {
      setProdFormError('Informe o nome do produto.');
      return;
    }
    if (!trimmedSku) {
      setProdFormError('Informe o código SKU do produto.');
      return;
    }

    const unitCostNum = Math.max(0, parseFloat(prodUnitCost) || 0);
    const unitPriceNum = Math.max(0, parseFloat(prodUnitPrice) || 0);
    const profitMarginPercent =
      unitCostNum > 0
        ? Math.round(((unitPriceNum - unitCostNum) / unitCostNum) * 100)
        : 100;

    const finalImageUrl =
      prodImageUrl ||
      createSvgProductPreviewDataUrl(trimmedSku, '#1D63FF', '#0D0F14');

    if (editingProduct) {
      await onUpdateProduct({
        ...editingProduct,
        name: trimmedName,
        sku: trimmedSku,
        category: prodCategory.trim() || 'Peça Técnica',
        technology: prodTech,
        weightGrams: Math.max(0, parseFloat(prodWeight) || 0),
        printTimeHours: Math.max(0, parseInt(prodHours, 10) || 0),
        printTimeMinutes: Math.max(
          0,
          Math.min(59, parseInt(prodMinutes, 10) || 0)
        ),
        filamentPricePerKg: Math.max(0, parseFloat(prodFilamentPrice) || 120),
        unitCost: unitCostNum,
        unitPrice: unitPriceNum,
        profitMarginPercent: Math.max(0, profitMarginPercent),
        stockQuantity: Math.max(0, parseInt(prodStock, 10) || 0),
        description: prodDesc.trim(),
        imageUrl: finalImageUrl,
      });
      showToast(`Produto "${trimmedName}" atualizado!`);
    } else {
      await onCreateProduct({
        name: trimmedName,
        sku: trimmedSku,
        category: prodCategory.trim() || 'Peça Técnica',
        technology: prodTech,
        weightGrams: Math.max(0, parseFloat(prodWeight) || 0),
        printTimeHours: Math.max(0, parseInt(prodHours, 10) || 0),
        printTimeMinutes: Math.max(
          0,
          Math.min(59, parseInt(prodMinutes, 10) || 0)
        ),
        filamentPricePerKg: Math.max(0, parseFloat(prodFilamentPrice) || 120),
        unitCost: unitCostNum,
        unitPrice: unitPriceNum,
        profitMarginPercent: Math.max(0, profitMarginPercent),
        stockQuantity: Math.max(0, parseInt(prodStock, 10) || 0),
        description: prodDesc.trim(),
        imageUrl: finalImageUrl,
      });
      showToast(`Novo produto "${trimmedName}" criado no catálogo!`);
    }

    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Produtos & Categorias do Catálogo
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Crie categorias personalizadas, visualize seus produtos filtrados, adicione fotos (câmera mobile ou arquivo) e edite preços e estoque
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {toast && (
            <div
              role="status"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/15 px-3.5 py-2 text-xs font-extrabold text-emerald-600 dark:text-emerald-400"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{toast}</span>
            </div>
          )}

          <button
            type="button"
            data-testid="btn-toggle-new-category"
            onClick={() => setIsCategoryFormOpen(!isCategoryFormOpen)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] px-4 py-2.5 text-xs font-extrabold text-slate-800 dark:text-slate-100 hover:border-[#1D63FF] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FolderPlus className="h-4 w-4 text-[#1D63FF]" />
            <span>{isCategoryFormOpen ? 'Fechar Nova Categoria' : 'Criar Categoria'}</span>
          </button>

          <button
            type="button"
            data-testid="btn-open-create-product"
            onClick={handleOpenCreateProductModal}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0D0F14] dark:bg-[#1D63FF] px-4 py-2.5 text-xs font-extrabold text-white hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 shadow-sm cursor-pointer"
          >
            <PackagePlus className="h-4 w-4" />
            <span>Novo Produto</span>
          </button>
        </div>
      </div>

      {/* CRIAR NOVA CATEGORIA DE PRODUTOS (Collapsible Panel) */}
      {isCategoryFormOpen && (
        <section
          aria-label="Criar Nova Categoria de Produto"
          className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-6 shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <Tag className="h-4 w-4 text-[#1D63FF]" />
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Criar Nova Categoria de Produtos
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsCategoryFormOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {catError && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-bold text-rose-500"
            >
              {catError}
            </div>
          )}

          <form
            onSubmit={handleCreateCategorySubmit}
            className="mt-4 grid grid-cols-1 items-end gap-4 md:grid-cols-12"
          >
            <div className="md:col-span-4">
              <label
                htmlFor="new-category-name"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Nome da Categoria *
              </label>
              <input
                id="new-category-name"
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Ex: Cosplay & Props, Automotivo, Odontológico..."
                className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
              />
            </div>

            <div className="md:col-span-4">
              <label
                htmlFor="new-category-desc"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Descrição Curta
              </label>
              <input
                id="new-category-desc"
                type="text"
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                placeholder="Ex: Peças sob medida para reposição automotiva"
                className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <span className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Cor Identificadora
              </span>
              <div className="mt-2 flex items-center gap-1.5">
                {CATEGORY_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setNewCatColor(c.hex)}
                    aria-label={`Cor ${c.label}`}
                    className={`h-6 w-6 rounded-full transition-transform cursor-pointer ${
                      newCatColor === c.hex
                        ? 'scale-110 ring-2 ring-offset-2 ring-[#1D63FF] dark:ring-offset-[#14171F]'
                        : 'opacity-75 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                data-testid="btn-save-new-category"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#1D63FF] px-4 py-2.5 text-xs font-extrabold text-white hover:bg-blue-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Salvar Categoria</span>
              </button>
            </div>
          </form>

          {/* Manage existing custom categories */}
          {categories.length > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="text-[11px] font-bold text-slate-400">
                CATEGORIAS CADASTRADAS ({categories.length})
              </div>
              <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {categories.map((cat) => {
                  const count = products.filter(
                    (p) => p.category === cat.name
                  ).length;
                  return (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0D0F14] p-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="h-3.5 w-3.5 shrink-0 rounded-full"
                          style={{ backgroundColor: cat.colorHex || '#1D63FF' }}
                        />
                        <div className="min-w-0">
                          <div className="truncate text-xs font-extrabold text-slate-900 dark:text-white">
                            {cat.name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {count} {count === 1 ? 'produto' : 'produtos'}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCategoryToDelete(cat)}
                        aria-label={`Excluir categoria ${cat.name}`}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* BARRA DE PESQUISA E FILTRO POR CATEGORIA */}
      <section className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-6 shadow-sm space-y-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          {/* Category Filter Tabs */}
          <div
            role="group"
            aria-label="Filtrar produtos por categoria"
            className="flex flex-wrap items-center gap-1.5"
          >
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[#0D0F14] dark:bg-[#1D63FF] text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-[#0D0F14] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Todas as Categorias ({products.length})
            </button>

            {allCategoryNames.map((catName) => {
              const count = products.filter(
                (p) => p.category === catName
              ).length;
              const isSelected = selectedCategory === catName;
              const catObj = categories.find((c) => c.name === catName);
              return (
                <button
                  key={catName}
                  type="button"
                  onClick={() => setSelectedCategory(catName)}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-[#0D0F14] dark:bg-[#1D63FF] text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-[#0D0F14] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: isSelected
                        ? '#FFFFFF'
                        : catObj?.colorHex || '#1D63FF',
                    }}
                  />
                  <span>
                    {catName} ({count})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full lg:w-80 shrink-0">
            <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              aria-label="Pesquisar produto por nome, SKU ou categoria"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar produto, SKU ou categoria..."
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] pl-10 pr-9 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Limpar pesquisa"
                className="absolute right-3 top-2.5 rounded-full p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* DISPLAY DE PRODUTOS COM LIMITE DE ALTURA (Inspirado no layout anexo image_f16ba315.png) */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>
            Exibindo <strong className="text-slate-900 dark:text-white">{filteredProducts.length}</strong> de{' '}
            {products.length} produtos cadastrados
          </span>
          <span>Role dentro da vitrine ou pesquise para filtrar</span>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-10 text-center">
            <Package className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-300">
              Nenhum produto encontrado para este filtro
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Limpe a busca ou clique em "Novo Produto" para cadastrar um item nesta categoria.
            </p>
          </div>
        ) : (
          <div
            data-testid="catalog-bounded-grid"
            className="max-h-[540px] overflow-y-auto pr-1 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            {filteredProducts.map((product) => {
              const previewSrc =
                product.imageUrl ||
                createSvgProductPreviewDataUrl(product.sku, '#1D63FF', '#0D0F14');

              return (
                <div
                  key={product.id}
                  data-testid={`catalog-product-card-${product.id}`}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0D0F14] p-4 shadow-sm hover:border-[#1D63FF] transition-all"
                >
                  {/* Top Row: Photo/Icon + Title/Subtitle + Action Pill Button (matching image_f16ba315.png) */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-slate-200 dark:border-slate-700 bg-[#1D63FF]/10">
                        <img
                          src={previewSrc}
                          alt={product.name}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-extrabold text-slate-900 dark:text-white">
                          {product.name}
                        </h3>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          <span>{product.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">{product.sku}</span>
                          <span aria-hidden="true">·</span>
                          <span>{product.weightGrams}g</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        data-testid={`btn-edit-product-${product.id}`}
                        onClick={() => handleOpenEditProductModal(product)}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-[#181C26] px-3 py-1.5 text-[11px] font-extrabold text-slate-800 dark:text-slate-100 hover:bg-[#1D63FF] hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <span>Editar</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="my-3.5 h-px bg-slate-100 dark:bg-slate-800/90" />

                  {/* Bottom Row: Left Price & Right Cost/Stock (matching image_f16ba315.png) */}
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <div className="text-[10px] font-bold tracking-wider text-slate-400">
                        VALOR UNITÁRIO
                      </div>
                      <div className="mt-0.5 font-mono text-base font-extrabold tabular-nums text-slate-900 dark:text-white">
                        {formatCurrencyBRL(product.unitPrice)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] font-bold tracking-wider text-slate-400">
                        CUSTO / ESTOQUE
                      </div>
                      <div className="mt-0.5 font-mono text-xs font-bold tabular-nums text-slate-500 dark:text-slate-400">
                        {formatCurrencyBRL(product.unitCost)} · {product.stockQuantity} un
                      </div>
                    </div>
                  </div>

                  {/* Secondary Footer Actions */}
                  <div className="mt-3 flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/60">
                    {onNavigateToOrdersWithProduct && (
                      <button
                        type="button"
                        onClick={() => onNavigateToOrdersWithProduct(product)}
                        className="text-[11px] font-bold text-[#1D63FF] dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        + Incluir em Orçamento
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setProductToDelete(product)}
                      aria-label={`Excluir produto ${product.name}`}
                      className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Excluir</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* MODAL DE CRIAR / EDITAR PRODUTO COM CÂMERA MOBILE & UPLOAD DE FOTO */}
      {isProductModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-product-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto"
        >
          <div className="my-8 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] p-6 sm:p-8 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3
                  id="modal-product-title"
                  className="text-xl font-extrabold text-slate-900 dark:text-white"
                >
                  {editingProduct
                    ? `Editar Produto: ${editingProduct.name}`
                    : 'Criar Novo Produto no Catálogo'}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Tire uma foto com a câmera do celular ou envie uma imagem para identificar a peça facilmente nos orçamentos
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                aria-label="Fechar modal"
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {prodFormError && (
              <div
                role="alert"
                className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-500"
              >
                {prodFormError}
              </div>
            )}

            <form onSubmit={handleSaveProductSubmit} className="mt-5 space-y-5">
              {/* PHOTO CAPTURE (MOBILE CAMERA) & UPLOAD SECTION */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] p-4">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Photo Preview Box */}
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#14171F]">
                    {prodImageUrl ? (
                      <img
                        src={prodImageUrl}
                        alt="Pré-visualização da foto do produto"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center text-slate-400">
                        <ImageIcon className="h-7 w-7" />
                        <span className="mt-1 text-[10px] font-semibold">Sem Foto</span>
                      </div>
                    )}
                  </div>

                  {/* Camera & Upload Buttons */}
                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                      Foto do Produto (Visualização no Catálogo e Orçamentos)
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      No celular, clique em <strong>Tirar Foto (Câmera)</strong> para fotografar a peça impressa na hora, ou escolha uma imagem da galeria/computador.
                    </p>

                    {/* Hidden File Inputs */}
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoFileSelected}
                      className="hidden"
                      aria-label="Capturar foto com a câmera do celular"
                    />
                    <input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoFileSelected}
                      className="hidden"
                      aria-label="Enviar foto do dispositivo"
                    />

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isProcessingPhoto}
                        onClick={() => cameraInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#1D63FF] px-3.5 py-2 text-xs font-extrabold text-white hover:bg-blue-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        <span>Tirar Foto (Câmera Mobile)</span>
                      </button>

                      <button
                        type="button"
                        disabled={isProcessingPhoto}
                        onClick={() => galleryInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#14171F] px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 hover:border-[#1D63FF] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Upload className="h-3.5 w-3.5 text-[#1D63FF]" />
                        <span>Subir Foto / Galeria</span>
                      </button>

                      {prodImageUrl && (
                        <button
                          type="button"
                          onClick={() => setProdImageUrl('')}
                          className="rounded-xl px-2.5 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          Remover Foto
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Details Form Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="prod-modal-name"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Nome do Produto 3D *
                  </label>
                  <input
                    id="prod-modal-name"
                    type="text"
                    required
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    placeholder="Ex: Suporte Articulado de Parede p/ Alexa Echo Dot"
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="prod-modal-sku"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Código SKU *
                  </label>
                  <input
                    id="prod-modal-sku"
                    type="text"
                    required
                    value={prodSku}
                    onChange={(e) => setProdSku(e.target.value)}
                    placeholder="Ex: PRD-ALEXA-01"
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 font-mono text-xs font-bold text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="prod-modal-category"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Categoria do Produto *
                  </label>
                  <select
                    id="prod-modal-category"
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  >
                    {allCategoryNames.map((catName) => (
                      <option key={catName} value={catName}>
                        {catName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="prod-modal-cost"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Custo Real Unitário (R$)
                  </label>
                  <input
                    id="prod-modal-cost"
                    type="number"
                    min={0}
                    step="0.01"
                    value={prodUnitCost}
                    onChange={(e) => setProdUnitCost(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 font-mono text-xs font-bold tabular-nums text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="prod-modal-price"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Preço de Venda Unitário (R$) *
                  </label>
                  <input
                    id="prod-modal-price"
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={prodUnitPrice}
                    onChange={(e) => setProdUnitPrice(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 font-mono text-xs font-extrabold tabular-nums text-[#1D63FF] dark:text-blue-400 focus:border-[#1D63FF] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="prod-modal-weight"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Peso da Peça (g)
                  </label>
                  <input
                    id="prod-modal-weight"
                    type="number"
                    min={1}
                    step="1"
                    value={prodWeight}
                    onChange={(e) => setProdWeight(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 font-mono text-xs font-bold tabular-nums text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="prod-modal-stock"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Estoque Disponível (un)
                  </label>
                  <input
                    id="prod-modal-stock"
                    type="number"
                    min={0}
                    step="1"
                    value={prodStock}
                    onChange={(e) => setProdStock(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 font-mono text-xs font-bold tabular-nums text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="prod-modal-desc"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Descrição Técnica / Material / Acabamento
                  </label>
                  <input
                    id="prod-modal-desc"
                    type="text"
                    value={prodDesc}
                    onChange={(e) => setProdDesc(e.target.value)}
                    placeholder="Ex: Impresso em PETG Preto Carbono com bico 0.4mm"
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  data-testid="btn-submit-product-modal"
                  className="rounded-xl bg-[#1D63FF] px-5 py-2.5 text-xs font-extrabold text-white hover:bg-blue-600 transition-colors shadow-md cursor-pointer"
                >
                  {editingProduct ? 'Salvar Alterações do Produto' : 'Criar Produto no Catálogo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL FOR CATEGORY */}
      <ConfirmDeleteModal
        isOpen={Boolean(categoryToDelete)}
        title="Excluir Categoria de Produto"
        description="Tem certeza que deseja excluir esta categoria? Os produtos cadastrados nela permanecerão salvos no seu catálogo."
        itemLabel={categoryToDelete ? categoryToDelete.name : undefined}
        onCancel={() => setCategoryToDelete(null)}
        onConfirm={() => {
          if (categoryToDelete) {
            onDeleteCategory(categoryToDelete.id);
            showToast(`Categoria "${categoryToDelete.name}" excluída.`);
            setCategoryToDelete(null);
          }
        }}
      />

      {/* CONFIRM DELETE MODAL FOR PRODUCT */}
      <ConfirmDeleteModal
        isOpen={Boolean(productToDelete)}
        title="Excluir Produto do Catálogo"
        description="Tem certeza que deseja excluir este produto? Esta ação removerá o produto do seu catálogo."
        itemLabel={
          productToDelete
            ? `${productToDelete.name} (${productToDelete.sku} · ${formatCurrencyBRL(
                productToDelete.unitPrice
              )})`
            : undefined
        }
        onCancel={() => setProductToDelete(null)}
        onConfirm={() => {
          if (productToDelete) {
            onDeleteProduct(productToDelete.id);
            showToast(`Produto "${productToDelete.name}" excluído do catálogo.`);
            setProductToDelete(null);
          }
        }}
      />
    </div>
  );
};
