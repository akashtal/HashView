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

const CustomImageCropper = ({
    visible,
    imageUri,
    aspectRatio = 1, // 1 for logo, 16/9 for cover
    onCancel,
    onCropComplete
}) => {
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    // Layout metrics
    const maskWidth = SCREEN_WIDTH * 0.9;
    const maskHeight = maskWidth / aspectRatio;

    const pan = useRef(new Animated.ValueXY()).current;
    const scale = useRef(new Animated.Value(1)).current;

    // Track current values
    const currentPan = useRef({ x: 0, y: 0 });
    const currentScale = useRef(1);

    // Listeners to keep track of current animated values
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

    useEffect(() => {
        if (visible && imageUri) {
            setLoading(true);
            Image.getSize(
                imageUri,
                (width, height) => {
                    setImageSize({ width, height });

                    // Reset pan/scale when a new image loads
                    pan.setValue({ x: 0, y: 0 });
                    scale.setValue(1);
                    currentPan.current = { x: 0, y: 0 };
                    currentScale.current = 1;

                    setLoading(false);
                },
                (error) => {
                    console.error("Failed to get image size", error);
                    setLoading(false);
                }
            );
        }
    }, [visible, imageUri]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,

            onPanResponderGrant: () => {
                pan.setOffset({
                    x: currentPan.current.x,
                    y: currentPan.current.y
                });
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

    const getContainerDimensions = () => {
        if (!imageSize.width || !imageSize.height) return { width: maskWidth, height: maskHeight };

        // Fit image inside mask width initially
        const scaleFactor = maskWidth / imageSize.width;
        let initialRenderWidth = maskWidth;
        let initialRenderHeight = imageSize.height * scaleFactor;

        // If it's too short for the mask height, scale by height instead
        if (initialRenderHeight < maskHeight) {
            const heightScaleFactor = maskHeight / imageSize.height;
            initialRenderWidth = imageSize.width * heightScaleFactor;
            initialRenderHeight = maskHeight;
        }

        return { width: initialRenderWidth, height: initialRenderHeight };
    };

    const handleCrop = async () => {
        try {
            setProcessing(true);
            const renderDim = getContainerDimensions();

            const realScale = currentScale.current;

            // Calculate how much the image was scaled initially to fit the screen
            const initialScaleX = imageSize.width / renderDim.width;
            const initialScaleY = imageSize.height / renderDim.height;

            // Calculate the offset of the image relative to the center of the mask
            // currentPan measures translation from center
            const offsetX = currentPan.current.x;
            const offsetY = currentPan.current.y;

            // The mask is fixed at center. 
            // Image center relative to Mask center is (offsetX, offsetY)
            // So Mask top-left relative to Image top-left in rendering coordinates is:
            const maskLeftInRender = (renderDim.width * realScale - maskWidth) / 2 - offsetX;
            const maskTopInRender = (renderDim.height * realScale - maskHeight) / 2 - offsetY;

            // Ensure we don't crop outside image bounds
            let safeLeft = Math.max(0, maskLeftInRender);
            let safeTop = Math.max(0, maskTopInRender);

            // Convert rendering coordinates back to original image pixels
            const finalCropX = safeLeft * initialScaleX / realScale;
            const finalCropY = safeTop * initialScaleY / realScale;
            const finalCropWidth = maskWidth * initialScaleX / realScale;
            const finalCropHeight = maskHeight * initialScaleY / realScale;

            // Clamp dimensions to actual image size
            const cropAction = {
                originX: Math.max(0, Math.floor(finalCropX)),
                originY: Math.max(0, Math.floor(finalCropY)),
                width: Math.min(imageSize.width, Math.floor(finalCropWidth)),
                height: Math.min(imageSize.height, Math.floor(finalCropHeight)),
            };

            const result = await ImageManipulator.manipulateAsync(
                imageUri,
                [{ crop: cropAction }],
                { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
            );

            setProcessing(false);
            onCropComplete(result);
        } catch (error) {
            console.error("Error cropping image:", error);
            setProcessing(false);
            alert("Failed to crop image.");
        }
    };

    const renderDim = getContainerDimensions();

    return (
        <Modal visible={visible} transparent={false} animationType="slide">
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Crop Image</Text>
                    <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
                        <Icon name="close" size={24} color="#6B7280" />
                    </TouchableOpacity>
                </View>

                {/* Cropping Area */}
                <View style={styles.cropContainer}>
                    {loading ? (
                        <ActivityIndicator size="large" color="#6366f1" />
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
                                    source={{ uri: imageUri }}
                                    style={{ width: '100%', height: '100%' }}
                                    resizeMode="cover"
                                />
                            </Animated.View>

                            {/* Mask Overlay (Pass-through touches via pointerEvents="none") */}
                            <View style={styles.maskOverlay} pointerEvents="none">
                                <View style={styles.maskTop} />
                                <View style={styles.maskMiddleRow}>
                                    <View style={styles.maskSide} />
                                    <View style={[styles.maskCenter, { width: maskWidth, height: maskHeight }]}>
                                        {/* Grid lines */}
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

                {/* Controls Footer */}
                <View style={styles.footer}>
                    <Text style={styles.hintsText}>Drag to pan the image exactly how you want it</Text>

                    <View style={styles.sliderContainer}>
                        <Text style={styles.sliderLabel}>Zoom</Text>
                        {/* Simple buttons for zoom since slider requires additional packages */}
                        <TouchableOpacity
                            style={styles.zoomButton}
                            onPress={() => scale.setValue(Math.max(1, currentScale.current - 0.2))}
                        >
                            <Icon name="remove" size={20} color="#374151" />
                        </TouchableOpacity>

                        <View style={styles.zoomBar}>
                            <View style={[styles.zoomFill, { width: `${Math.min(100, (currentScale.current - 1) * 50)}%` }]} />
                        </View>

                        <TouchableOpacity
                            style={styles.zoomButton}
                            onPress={() => scale.setValue(Math.min(3, currentScale.current + 0.2))}
                        >
                            <Icon name="add" size={20} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.btnCancel} onPress={onCancel}>
                            <Text style={styles.btnCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.btnSave}
                            onPress={handleCrop}
                            disabled={processing || loading}
                        >
                            {processing ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <>
                                    <Icon name="checkmark" size={18} color="#FFF" style={{ marginRight: 6 }} />
                                    <Text style={styles.btnSaveText}>Apply Crop</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
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
        paddingTop: 50, // SafeArea roughly
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
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
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
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.4)',
        top: '33.3%',
    },
    gridLineV: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.4)',
        left: '33.3%',
    },
    footer: {
        backgroundColor: '#FFF',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 40,
    },
    hintsText: {
        textAlign: 'center',
        color: '#374151',
        fontWeight: '500',
        marginBottom: 20,
    },
    sliderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    sliderLabel: {
        color: '#6B7280',
        fontWeight: '500',
        marginRight: 16,
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
        backgroundColor: '#4F46E5', // Primary color
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingTop: 16,
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
        backgroundColor: '#4F46E5', // Primary
    },
    btnSaveText: {
        color: '#FFF',
        fontWeight: '600',
    }
});

export default CustomImageCropper;
