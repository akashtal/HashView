import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Animated,
    PanResponder,
    Image,
    ActivityIndicator
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Max pixel dimension to render inside the cropper.
// Images larger than this are resized BEFORE display so the UI stays fast.
const MAX_PREVIEW_DIM = 1400;

const CustomImageCropper = ({
    visible,
    imageUri,
    aspectRatio = 1, // 1 for logo (1:1), 16/9 for cover
    onCancel,
    onCropComplete
}) => {
    // workingUri / workingSize → the (possibly resized) image used for display and crop
    const [workingUri, setWorkingUri] = useState(null);
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [loadError, setLoadError] = useState(null);

    // Layout metrics for the crop window
    const maskWidth = SCREEN_WIDTH * 0.9;
    const maskHeight = maskWidth / aspectRatio;

    const pan = useRef(new Animated.ValueXY()).current;
    const scale = useRef(new Animated.Value(1)).current;

    // Track current animated values synchronously
    const currentPan = useRef({ x: 0, y: 0 });
    const currentScale = useRef(1);

    // ─── Sync animated value listeners ─────────────────────────────────────
    useEffect(() => {
        const panListener = pan.addListener((value) => {
            currentPan.current = value;
        });
        const scaleListener = scale.addListener(({ value }) => {
            currentScale.current = value;
        });
        return () => {
            pan.removeListener(panListener);
            scale.removeListener(scaleListener);
        };
    }, [pan, scale]);

    // ─── Prepare image when modal opens ────────────────────────────────────
    // Resizes large images so the cropper is fast and responsive.
    useEffect(() => {
        if (!visible || !imageUri) return;

        let cancelled = false;
        setLoading(true);
        setLoadError(null);
        setWorkingUri(null);

        const prepare = async () => {
            try {
                // First get the actual image dimensions
                const { width: origW, height: origH } = await new Promise((resolve, reject) => {
                    Image.getSize(
                        imageUri,
                        (w, h) => resolve({ width: w, height: h }),
                        reject
                    );
                });

                if (cancelled) return;

                let finalUri = imageUri;
                let finalW = origW;
                let finalH = origH;

                // Resize if the image is larger than MAX_PREVIEW_DIM to make the
                // cropper fast — without degrading the visible crop quality.
                if (origW > MAX_PREVIEW_DIM || origH > MAX_PREVIEW_DIM) {
                    const ratio = Math.min(MAX_PREVIEW_DIM / origW, MAX_PREVIEW_DIM / origH);
                    const targetW = Math.round(origW * ratio);
                    const targetH = Math.round(origH * ratio);

                    try {
                        const resized = await ImageManipulator.manipulateAsync(
                            imageUri,
                            [{ resize: { width: targetW, height: targetH } }],
                            { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG }
                        );
                        finalUri = resized.uri;
                        finalW = resized.width;
                        finalH = resized.height;
                    } catch (resizeErr) {
                        // Resize failed → fall back to the original
                        console.warn('[Cropper] resize failed, using original:', resizeErr.message);
                    }
                }

                if (cancelled) return;

                setWorkingUri(finalUri);
                setImageSize({ width: finalW, height: finalH });

                // Reset pan / scale for this new image
                pan.setValue({ x: 0, y: 0 });
                scale.setValue(1);
                currentPan.current = { x: 0, y: 0 };
                currentScale.current = 1;

                setLoading(false);
            } catch (err) {
                if (cancelled) return;
                console.error('[Cropper] Failed to prepare image:', err);
                setLoadError('Could not load image. Please try again.');
                setLoading(false);
            }
        };

        prepare();
        return () => { cancelled = true; };
    }, [visible, imageUri]);

    // ─── Pan responder ──────────────────────────────────────────────────────
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,

            onPanResponderGrant: () => {
                pan.setOffset({ x: currentPan.current.x, y: currentPan.current.y });
                pan.setValue({ x: 0, y: 0 });
            },

            onPanResponderMove: Animated.event(
                [null, { dx: pan.x, dy: pan.y }],
                { useNativeDriver: false }
            ),

            onPanResponderRelease: () => {
                pan.flattenOffset();
            }
        })
    ).current;

    // ─── Compute the initial rendered dimensions ────────────────────────────
    const getContainerDimensions = () => {
        if (!imageSize.width || !imageSize.height) {
            return { width: maskWidth, height: maskHeight };
        }

        // Scale to fit mask width
        const scaleByWidth = maskWidth / imageSize.width;
        let renderW = maskWidth;
        let renderH = imageSize.height * scaleByWidth;

        // If too short for mask height, scale by height instead
        if (renderH < maskHeight) {
            const scaleByHeight = maskHeight / imageSize.height;
            renderW = imageSize.width * scaleByHeight;
            renderH = maskHeight;
        }

        return { width: renderW, height: renderH };
    };

    // ─── Apply crop ─────────────────────────────────────────────────────────
    const handleCrop = async () => {
        if (!workingUri || !imageSize.width || !imageSize.height) return;

        try {
            setProcessing(true);

            const renderDim = getContainerDimensions();
            const realScale = currentScale.current;

            // How much the rendered image differs from original pixel dimensions
            const initialScaleX = imageSize.width / renderDim.width;
            const initialScaleY = imageSize.height / renderDim.height;

            const offsetX = currentPan.current.x;
            const offsetY = currentPan.current.y;

            // Position of the crop window's top-left, in rendered-image coordinates
            const maskLeftInRender = (renderDim.width * realScale - maskWidth) / 2 - offsetX;
            const maskTopInRender = (renderDim.height * realScale - maskHeight) / 2 - offsetY;

            // Clamp to non-negative
            const safeLeft = Math.max(0, maskLeftInRender);
            const safeTop = Math.max(0, maskTopInRender);

            // Convert rendering coords → original image pixels
            const rawX = safeLeft * initialScaleX / realScale;
            const rawY = safeTop * initialScaleY / realScale;
            const rawW = maskWidth * initialScaleX / realScale;
            const rawH = maskHeight * initialScaleY / realScale;

            // ── Critical fix: ensure origin + size never exceeds image bounds ──
            const originX = Math.max(0, Math.floor(rawX));
            const originY = Math.max(0, Math.floor(rawY));
            const cropW = Math.max(1, Math.min(imageSize.width - originX, Math.floor(rawW)));
            const cropH = Math.max(1, Math.min(imageSize.height - originY, Math.floor(rawH)));

            console.log('[Cropper] Crop action:', { originX, originY, cropW, cropH },
                '| Image:', imageSize);

            const result = await ImageManipulator.manipulateAsync(
                workingUri,
                [{ crop: { originX, originY, width: cropW, height: cropH } }],
                { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG }
            );

            setProcessing(false);
            onCropComplete(result); // { uri, width, height }
        } catch (error) {
            console.error('[Cropper] Crop failed:', error);
            setProcessing(false);
            alert('Failed to crop the image. Please try again.');
        }
    };

    const renderDim = getContainerDimensions();

    return (
        <Modal visible={visible} transparent={false} animationType="slide"
            onRequestClose={onCancel}>
            <View style={styles.container}>

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Crop Image</Text>
                    <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
                        <Icon name="close" size={24} color="#6B7280" />
                    </TouchableOpacity>
                </View>

                {/* Crop area */}
                <View style={styles.cropContainer}>
                    {loading ? (
                        <View style={styles.loadingBox}>
                            <ActivityIndicator size="large" color="#6366f1" />
                            <Text style={styles.loadingText}>Preparing image…</Text>
                        </View>
                    ) : loadError ? (
                        <View style={styles.loadingBox}>
                            <Icon name="alert-circle-outline" size={40} color="#EF4444" />
                            <Text style={[styles.loadingText, { color: '#EF4444', marginTop: 12 }]}>
                                {loadError}
                            </Text>
                            <TouchableOpacity style={styles.retryBtn} onPress={onCancel}>
                                <Text style={{ color: '#FFF', fontWeight: '700' }}>Go Back</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.workspace}>
                            {/* Draggable Image */}
                            <Animated.View
                                {...panResponder.panHandlers}
                                style={[
                                    styles.imageWrapper,
                                    {
                                        transform: [
                                            { translateX: pan.x },
                                            { translateY: pan.y },
                                            { scale: scale }
                                        ],
                                        width: renderDim.width,
                                        height: renderDim.height
                                    }
                                ]}
                            >
                                <Image
                                    source={{ uri: workingUri }}
                                    style={{ width: '100%', height: '100%' }}
                                    resizeMode="cover"
                                />
                            </Animated.View>

                            {/* Mask overlay */}
                            <View style={styles.maskOverlay} pointerEvents="none">
                                <View style={styles.maskTop} />
                                <View style={styles.maskMiddleRow}>
                                    <View style={styles.maskSide} />
                                    <View style={[styles.maskCenter, { width: maskWidth, height: maskHeight }]}>
                                        {/* Rule-of-thirds grid */}
                                        <View style={styles.gridLineH} />
                                        <View style={[styles.gridLineH, { top: '66.6%' }]} />
                                        <View style={styles.gridLineV} />
                                        <View style={[styles.gridLineV, { left: '66.6%' }]} />
                                    </View>
                                    <View style={styles.maskSide} />
                                </View>
                                <View style={styles.maskBottom} />
                            </View>
                        </View>
                    )}
                </View>

                {/* Footer */}
                {!loading && !loadError && (
                    <View style={styles.footer}>
                        <Text style={styles.hintsText}>
                            Drag to reposition · Pinch or use buttons to zoom
                        </Text>

                        {/* Zoom controls */}
                        <View style={styles.sliderContainer}>
                            <Text style={styles.sliderLabel}>Zoom</Text>
                            <TouchableOpacity
                                style={styles.zoomButton}
                                onPress={() => {
                                    const next = Math.max(1, currentScale.current - 0.15);
                                    scale.setValue(next);
                                }}
                            >
                                <Icon name="remove" size={20} color="#374151" />
                            </TouchableOpacity>
                            <View style={styles.zoomBar}>
                                <Animated.View
                                    style={[
                                        styles.zoomFill,
                                        {
                                            width: scale.interpolate({
                                                inputRange: [1, 3],
                                                outputRange: ['0%', '100%'],
                                                extrapolate: 'clamp',
                                            })
                                        }
                                    ]}
                                />
                            </View>
                            <TouchableOpacity
                                style={styles.zoomButton}
                                onPress={() => {
                                    const next = Math.min(4, currentScale.current + 0.15);
                                    scale.setValue(next);
                                }}
                            >
                                <Icon name="add" size={20} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        {/* Actions */}
                        <View style={styles.actionRow}>
                            <TouchableOpacity style={styles.btnCancel} onPress={onCancel}>
                                <Text style={styles.btnCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.btnSave, processing && { opacity: 0.6 }]}
                                onPress={handleCrop}
                                disabled={processing}
                            >
                                {processing ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <>
                                        <Icon name="checkmark" size={18} color="#FFF"
                                            style={{ marginRight: 6 }} />
                                        <Text style={styles.btnSaveText}>Apply Crop</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingTop: 50,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
    },
    closeButton: {
        padding: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
    },
    cropContainer: {
        flex: 1,
        backgroundColor: '#111827',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    loadingBox: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    loadingText: {
        color: '#9CA3AF',
        marginTop: 16,
        fontSize: 14,
        fontWeight: '500',
    },
    retryBtn: {
        marginTop: 20,
        backgroundColor: '#EF4444',
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 10,
    },
    workspace: {
        width: SCREEN_WIDTH,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageWrapper: {
        position: 'absolute',
    },
    maskOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
    },
    maskTop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    maskBottom: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    maskMiddleRow: {
        flexDirection: 'row',
    },
    maskSide: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    maskCenter: {
        borderColor: '#FFF',
        borderWidth: 2,
        position: 'relative',
    },
    gridLineH: {
        position: 'absolute',
        left: 0, right: 0,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.35)',
        top: '33.3%',
    },
    gridLineV: {
        position: 'absolute',
        top: 0, bottom: 0,
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.35)',
        left: '33.3%',
    },
    footer: {
        backgroundColor: '#FFF',
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 40,
    },
    hintsText: {
        textAlign: 'center',
        color: '#6B7280',
        fontWeight: '500',
        fontSize: 13,
        marginBottom: 16,
    },
    sliderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    sliderLabel: {
        color: '#6B7280',
        fontWeight: '500',
        marginRight: 14,
    },
    zoomButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    zoomBar: {
        flex: 1,
        height: 6,
        backgroundColor: '#E5E7EB',
        borderRadius: 3,
        marginHorizontal: 12,
        overflow: 'hidden',
    },
    zoomFill: {
        height: '100%',
        backgroundColor: '#4F46E5',
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingTop: 14,
    },
    btnCancel: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        marginRight: 12,
    },
    btnCancelText: {
        color: '#374151',
        fontWeight: '600',
    },
    btnSave: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        backgroundColor: '#4F46E5',
    },
    btnSaveText: {
        color: '#FFF',
        fontWeight: '600',
    },
});

export default CustomImageCropper;
