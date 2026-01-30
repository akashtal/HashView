import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, Eye, EyeOff, X,
  Utensils, Coffee, Beer, Pizza, IceCream,
  Dumbbell, Heart, Scissors, Car, Home,
  Shirt, ShoppingBasket, Book, Gamepad2, Film,
  Briefcase, GraduationCap, Sparkles, PawPrint, Leaf,
  Store, ShoppingCart, Hammer, Laptop, Phone
} from 'lucide-react';
import { adminApi } from '../api/adminApi';

const CATEGORY_ICONS = [
  { name: 'restaurant', icon: Utensils, label: 'Restaurant' },
  { name: 'cafe', icon: Coffee, label: 'Cafe' },
  { name: 'beer', icon: Beer, label: 'Bar' },
  { name: 'pizza', icon: Pizza, label: 'Pizza' },
  { name: 'ice-cream', icon: IceCream, label: 'Dessert' },
  { name: 'fitness', icon: Dumbbell, label: 'Fitness' },
  { name: 'medkit', icon: Heart, label: 'Health' },
  { name: 'cut', icon: Scissors, label: 'Salon' },
  { name: 'car', icon: Car, label: 'Auto' },
  { name: 'home', icon: Home, label: 'Home' },
  { name: 'shirt', icon: Shirt, label: 'Fashion' },
  { name: 'basket', icon: ShoppingBasket, label: 'Grocery' },
  { name: 'book', icon: Book, label: 'Books' },
  { name: 'game-controller', icon: Gamepad2, label: 'Gaming' },
  { name: 'film', icon: Film, label: 'Entertainment' },
  { name: 'briefcase', icon: Briefcase, label: 'Business' },
  { name: 'school', icon: GraduationCap, label: 'Education' },
  { name: 'sparkles', icon: Sparkles, label: 'Beauty' },
  { name: 'paw', icon: PawPrint, label: 'Pets' },
  { name: 'leaf', icon: Leaf, label: 'Nature' },
  { name: 'store', icon: Store, label: 'Store' },
  { name: 'cart', icon: ShoppingCart, label: 'Shop' },
  { name: 'hammer', icon: Hammer, label: 'Tools' },
  { name: 'laptop', icon: Laptop, label: 'Tech' },
  { name: 'phone', icon: Phone, label: 'Telecom' },
];

const COMMON_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6B7280'
];

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    icon: 'restaurant',
    color: '#6B7280',
    order: 0
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getAllCategories();
      // Backend returns { success, count, categories: [...] }
      // Axios wraps it so: response.data.categories is the categories array
      setCategories(response.data?.categories || response.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      alert('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        icon: category.icon || 'restaurant',
        color: category.color || '#6B7280',
        order: category.order || 0
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        icon: 'restaurant',
        color: '#6B7280',
        order: 0
      });
    }
    setModalOpen(true);
  };

  const getIconComponent = (iconName) => {
    const iconData = CATEGORY_ICONS.find(i => i.name === iconName);
    return iconData ? iconData.icon : Utensils;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Please enter category name');
      return;
    }

    try {
      if (editingCategory) {
        await adminApi.updateCategory(editingCategory._id, formData);
        alert('Category updated successfully');
      } else {
        await adminApi.createCategory(formData);
        alert('Category created successfully');
      }
      setModalOpen(false);
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      alert(error.response?.data?.message || 'Failed to save category');
    }
  };

  const handleDelete = async (category) => {
    if (!window.confirm(`Are you sure you want to delete "${category.name}"?`)) {
      return;
    }

    try {
      await adminApi.deleteCategory(category._id);
      alert('Category deleted successfully');
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category');
    }
  };

  const handleToggleActive = async (category) => {
    try {
      await adminApi.updateCategory(category._id, {
        isActive: !category.isActive
      });
      fetchCategories();
    } catch (error) {
      console.error('Error toggling category:', error);
      alert('Failed to update category status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading categories...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-600 mt-1">{categories.length} total categories</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
        >
          <Plus size={20} />
          Add Category
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl p-12 text-center border border-gray-200">
            <p className="text-gray-500 mb-4">No categories yet</p>
            <button
              onClick={() => handleOpenModal()}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              Create First Category
            </button>
          </div>
        ) : (
          categories.map((category) => (
            <div
              key={category._id}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                    style={{ backgroundColor: category.color }}
                  >
                    {React.createElement(getIconComponent(category.icon), { size: 24 })}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{category.name}</h3>
                    <p className="text-sm text-gray-500">Order: {category.order}</p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                    category.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {category.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleActive(category)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                >
                  {category.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                  {category.isActive ? 'Hide' : 'Show'}
                </button>
                <button
                  onClick={() => handleOpenModal(category)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition"
                >
                  <Edit2 size={16} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(category)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingCategory ? 'Edit Category' : 'New Category'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6">
              {/* Category Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Restaurant, Cafe, Hotel"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Icon Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Icon *
                </label>
                <div className="grid grid-cols-5 gap-2 max-h-60 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                  {CATEGORY_ICONS.map((iconData) => {
                    const IconComponent = iconData.icon;
                    return (
                      <button
                        key={iconData.name}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon: iconData.name })}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg transition hover:bg-gray-100 ${
                          formData.icon === iconData.name
                            ? 'bg-purple-600 text-white hover:bg-purple-700'
                            : 'bg-gray-50 text-gray-600'
                        }`}
                        title={iconData.label}
                      >
                        <IconComponent size={24} />
                        <span className="text-xs mt-1 text-center">{iconData.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-12 h-12 rounded-xl transition ${
                        formData.color === color ? 'ring-4 ring-offset-2 ring-gray-400' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Order */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Display Order
                </label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Preview
                </label>
                <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-3">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-white"
                    style={{ backgroundColor: formData.color }}
                  >
                    {React.createElement(getIconComponent(formData.icon), { size: 28 })}
                  </div>
                  <span className="text-lg font-bold text-gray-900">
                    {formData.name || 'Category Name'}
                  </span>
                </div>
              </div>

              {/* Save Button */}
              <button
                type="submit"
                className="w-full py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition"
              >
                {editingCategory ? 'Update Category' : 'Create Category'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;

