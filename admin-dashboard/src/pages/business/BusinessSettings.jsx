import React, { useState, useEffect } from 'react';
import { useBusinessAuth } from '../../context/BusinessAuthContext';
import biz from '../../api/businessApi';
import { Camera, Save, MapPin, Store, Globe, Phone, Mail, Image as ImageIcon } from 'lucide-react';

export default function BusinessSettings() {
  const { business } = useBusinessAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    name: '',
    description: '',
    phone: '',
    email: '',
    website: '',
    category: '',
    address: {
      buildingNumber: '',
      street: '',
      city: '',
      county: '',
      postcode: '',
      country: 'United Kingdom'
    }
  });

  const [images, setImages] = useState({
    logo: null,
    banner: null
  });

  const [preview, setPreview] = useState({
    logo: null,
    banner: null
  });

  useEffect(() => {
    if (business) {
      setForm({
        name: business.name || '',
        description: business.description || '',
        phone: business.phone || '',
        email: business.email || '',
        website: business.website || '',
        category: business.category || '',
        address: {
          buildingNumber: business.address?.buildingNumber || '',
          street: business.address?.street || '',
          city: business.address?.city || '',
          county: business.address?.county || '',
          postcode: business.address?.postcode || '',
          country: business.address?.country || 'United Kingdom'
        }
      });
      setPreview({
        logo: business.logo?.url || null,
        banner: business.banner?.url || null
      });
    }
  }, [business]);

  const handleImageChange = (type, e) => {
    const file = e.target.files[0];
    if (file) {
      setImages(prev => ({ ...prev, [type]: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(prev => ({ ...prev, [type]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    if (!business?._id) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await biz.updateBusiness(business._id, form);
      if (res.data.success) {
        setSuccess('Business information updated successfully!');
        // clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update business information');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveImages = async () => {
    if (!business?._id) return;
    if (!images.logo && !images.banner) {
      setError('Please select an image to upload first.');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    if (images.logo) formData.append('logo', images.logo);
    if (images.banner) formData.append('banner', images.banner);

    try {
      const res = await biz.updateBusinessImages(business._id, formData);
      if (res.data.success) {
        setSuccess('Images updated successfully!');
        setImages({ logo: null, banner: null });
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update images');
    } finally {
      setUploading(false);
    }
  };

  if (!business) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Business Settings</h1>
        <p className="text-gray-500 mt-2">Manage your restaurant profile, images, and contact information.</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2">
          <span>✅</span> {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column - Images */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ImageIcon size={20} className="text-purple-600" /> Brand Images
            </h2>

            {/* Logo Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Business Logo</label>
              <div className="relative w-32 h-32 mx-auto rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-100 group">
                {preview.logo ? (
                  <img src={preview.logo} alt="Logo preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Store size={40} />
                  </div>
                )}
                <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                  <Camera size={24} className="mb-1" />
                  <span className="text-xs font-medium">Change</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange('logo', e)} />
                </label>
              </div>
            </div>

            {/* Banner Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Cover Banner</label>
              <div className="relative w-full h-32 rounded-xl border border-gray-200 overflow-hidden bg-gray-100 group">
                {preview.banner ? (
                  <img src={preview.banner} alt="Banner preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <ImageIcon size={32} />
                  </div>
                )}
                <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                  <Camera size={24} className="mb-1" />
                  <span className="text-xs font-medium">Change Banner</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange('banner', e)} />
                </label>
              </div>
            </div>

            {(images.logo || images.banner) && (
              <button
                onClick={handleSaveImages}
                disabled={uploading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 rounded-xl transition flex items-center justify-center gap-2"
              >
                {uploading ? <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4" /> : <Save size={18} />}
                {uploading ? 'Uploading...' : 'Save Images'}
              </button>
            )}
          </div>
        </div>

        {/* Right Column - Info Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSaveInfo} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Store size={20} className="text-purple-600" /> Basic Information
              </h2>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g. Italian, Cafe, Pub"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows="3"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Tell your customers about your restaurant..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Phone size={14} /> Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Mail size={14} /> Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Globe size={14} /> Website</label>
                  <input
                    type="url"
                    value={form.website}
                    onChange={e => setForm({ ...form, website: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="https://"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100">
                <h3 className="text-md font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin size={18} className="text-purple-600" /> Location Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Building/Number</label>
                    <input
                      type="text"
                      value={form.address.buildingNumber}
                      onChange={e => setForm({ ...form, address: { ...form.address, buildingNumber: e.target.value } })}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street</label>
                    <input
                      type="text"
                      value={form.address.street}
                      onChange={e => setForm({ ...form, address: { ...form.address, street: e.target.value } })}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={form.address.city}
                      onChange={e => setForm({ ...form, address: { ...form.address, city: e.target.value } })}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
                    <input
                      type="text"
                      value={form.address.postcode}
                      onChange={e => setForm({ ...form, address: { ...form.address, postcode: e.target.value } })}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-gray-900 hover:bg-black text-white font-medium py-2.5 px-6 rounded-xl transition flex items-center justify-center gap-2 shadow-md"
              >
                {loading ? <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4" /> : <Save size={18} />}
                {loading ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
