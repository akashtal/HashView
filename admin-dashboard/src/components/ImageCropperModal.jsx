import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, Check } from 'lucide-react';

const createImage = (url) =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
    });

const getCroppedImg = async (imageSrc, pixelCrop) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        return null;
    }

    // Set canvas size to match the bounding box
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // Draw the cropped image onto the canvas
    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    // Return as a blob
    return new Promise((resolve, reject) => {
        canvas.toBlob((file) => {
            resolve(file);
        }, 'image/jpeg');
    });
};

const ImageCropperModal = ({ isOpen, imageSrc, aspect = 1, onCropComplete, onCancel }) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const onCropChange = (crop) => {
        setCrop(crop);
    };

    const onZoomChange = (zoom) => {
        setZoom(zoom);
    };

    const onCropCompleteHandler = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSave = async () => {
        try {
            if (!croppedAreaPixels || !imageSrc) return;
            const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
            onCropComplete(croppedImageBlob);
        } catch (e) {
            console.error(e);
            alert('Failed to crop image');
        }
    };

    if (!isOpen || !imageSrc) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-[80vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900">Crop Image</h3>
                    <button
                        onClick={onCancel}
                        className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-100 hover:bg-gray-200 rounded-full p-2"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Cropper Area */}
                <div className="relative flex-1 bg-gray-900 overflow-hidden">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspect}
                        onCropChange={onCropChange}
                        onCropComplete={onCropCompleteHandler}
                        onZoomChange={onZoomChange}
                        showGrid={true}
                    />
                </div>

                {/* Controls Panel */}
                <div className="p-6 bg-white border-t border-gray-100">
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                            Zoom & Pan the image to adjust exactly how you want it
                        </label>
                        <div className="flex items-center gap-4 px-4">
                            <span className="text-gray-500 font-medium whitespace-nowrap">Zoom</span>
                            <input
                                type="range"
                                value={zoom}
                                min={1}
                                max={3}
                                step={0.1}
                                aria-labelledby="Zoom"
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600 hover:accent-primary-700"
                            />
                            <span className="text-gray-700 font-medium whitespace-nowrap w-8">
                                {Math.round(zoom * 100)}%
                            </span>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                        <button
                            onClick={onCancel}
                            className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-all shadow-sm flex items-center pr-5"
                        >
                            <Check size={18} className="mr-2" />
                            Apply Crop
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageCropperModal;
