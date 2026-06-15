import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useSelector } from 'react-redux';
import ApiService from '../../services/api.service';
import { COLORS } from '../../config/colors';

// ─── Step indicator ──────────────────────────────────────────────────────────
const StepIndicator = ({ current }) => {
  const steps = ['Claim Listing', 'Verify Identity', 'Submitted'];
  return (
    <View className="flex-row items-center justify-center py-4 px-6">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const done = stepNum < current;
        const active = stepNum === current;
        return (
          <React.Fragment key={i}>
            {i > 0 && <View className={`flex-1 h-0.5 ${done ? 'bg-green-500' : 'bg-gray-200'}`} />}
            <View className="items-center">
              <View
                className={`w-8 h-8 rounded-full items-center justify-center ${
                  done ? 'bg-green-500' : active ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                {done ? (
                  <Icon name="checkmark" size={14} color="white" />
                ) : (
                  <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-gray-500'}`}>
                    {stepNum}
                  </Text>
                )}
              </View>
              <Text
                className={`text-[9px] mt-1 font-semibold ${
                  active ? 'text-indigo-600' : done ? 'text-green-600' : 'text-gray-400'
                }`}
              >
                {label}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
};

// ─── Checkbox component ───────────────────────────────────────────────────────
const Checkbox = ({ checked, onPress, label, labelElement }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.7} className="flex-row items-start mb-3">
    <View
      className={`w-5 h-5 rounded border-2 mr-2.5 mt-0.5 items-center justify-center ${
        checked ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
      }`}
    >
      {checked && <Icon name="checkmark" size={12} color="white" />}
    </View>
    {labelElement ? (
      <View style={{ flex: 1 }}>{labelElement}</View>
    ) : (
      <Text className="flex-1 text-sm text-gray-700 leading-5">{label}</Text>
    )}
  </TouchableOpacity>
);

// ─── Role picker ──────────────────────────────────────────────────────────────
const roles = [
  { label: 'Owner', value: 'owner' },
  { label: 'Manager', value: 'manager' },
  { label: 'Authorized Representative', value: 'other' },
];

export default function ClaimBusinessScreen({ route, navigation }) {
  const { business } = route.params;
  const { user } = useSelector((s) => s.auth);

  // State
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState(user?.email || '');
  const [role, setRole] = useState('owner');
  const [certify, setCertify] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  // Step 2 — verification
  const [verifyMethod, setVerifyMethod] = useState(null); // 'document' | 'phone'

  // Document upload
  const [idPhoto, setIdPhoto] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [uploadingDocs, setUploadingDocs] = useState(false);

  // Phone OTP
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const pickImage = async (setter) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets?.length) {
      setter(result.assets[0]);
    }
  };

  const takePhoto = async (setter) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera Permission', 'Please allow camera access to take a selfie.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true });
    if (!result.canceled && result.assets?.length) {
      setter(result.assets[0]);
    }
  };

  // ── Step 1: Submit claim ─────────────────────────────────────────────────
  const handleSubmitClaim = async () => {
    if (!email.trim()) return Alert.alert('Required', 'Please enter the business email address.');
    if (!certify)
      return Alert.alert('Required', 'Please certify that you are an authorised representative.');
    if (!agreeTerms)
      return Alert.alert('Required', 'Please accept the Terms of Service and Privacy Policy.');

    setLoading(true);
    try {
      await ApiService.claimBusiness(business._id, {
        businessEmail: email.trim(),
        role,
        agreedToTerms: true,
      });
      setStep(2);
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not submit claim. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2A: Upload documents ────────────────────────────────────────────
  const handleUploadDocuments = async () => {
    if (!idPhoto) return Alert.alert('Required', 'Please upload your Photo ID.');
    if (!selfie) return Alert.alert('Required', 'Please take a selfie.');

    setUploadingDocs(true);
    try {
      const formData = new FormData();
      formData.append('ownerIdProof', {
        uri: idPhoto.uri,
        name: 'id_proof.jpg',
        type: 'image/jpeg',
      });
      formData.append('selfie', {
        uri: selfie.uri,
        name: 'selfie.jpg',
        type: 'image/jpeg',
      });
      await ApiService.uploadClaimDocuments(business._id, formData);
      setStep(3);
    } catch (e) {
      Alert.alert('Upload Error', e.message || 'Could not upload documents. Please try again.');
    } finally {
      setUploadingDocs(false);
    }
  };

  // ── Step 2B: Phone OTP ───────────────────────────────────────────────────
  const handleSendOtp = async () => {
    setSendingOtp(true);
    try {
      const res = await ApiService.sendClaimPhoneOtp(business._id);
      setMaskedPhone(res.phone || '');
      setOtpSent(true);
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not send OTP. Please try again.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.length < 4)
      return Alert.alert('Required', 'Please enter the OTP you received.');
    setVerifyingOtp(true);
    try {
      await ApiService.verifyClaimPhoneOtp(business._id, otp.trim());
      setStep(3);
    } catch (e) {
      Alert.alert('Invalid OTP', e.message || 'The OTP you entered is incorrect or has expired.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <LinearGradient
        colors={['#2D1B69', '#4F46E5']}
        className="pt-14 pb-4 px-4 flex-row items-center"
      >
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <Icon name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-white text-lg font-bold">Claim Your Listing</Text>
          <Text className="text-white/70 text-xs" numberOfLines={1}>
            {business.name}
          </Text>
        </View>
      </LinearGradient>

      <StepIndicator current={step} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
          {/* ───── STEP 1: CLAIM LISTING ───── */}
          {step === 1 && (
            <View className="pb-8">
              <Text className="text-2xl font-bold text-gray-900 mb-1 mt-2">Claim your listing</Text>
              <Text className="text-sm text-gray-500 mb-6">
                Confirm you are an authorised representative of this business to claim it.
              </Text>

              {/* Business email */}
              <Text className="text-sm font-semibold text-gray-700 mb-1.5">Business email *</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="e.g. info@yourbusiness.com"
                keyboardType="email-address"
                autoCapitalize="none"
                className="border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 bg-gray-50 mb-4"
              />

              {/* Role */}
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Your role at this business *
              </Text>
              <View className="bg-gray-50 rounded-xl border border-gray-200 mb-5 overflow-hidden">
                {roles.map((r, idx) => (
                  <TouchableOpacity
                    key={r.value}
                    onPress={() => setRole(r.value)}
                    activeOpacity={0.7}
                    className={`flex-row items-center px-4 py-3.5 ${idx < roles.length - 1 ? 'border-b border-gray-100' : ''}`}
                  >
                    <View
                      className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                        role === r.value ? 'border-indigo-600' : 'border-gray-300'
                      }`}
                    >
                      {role === r.value && (
                        <View className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                      )}
                    </View>
                    <Text
                      className={`text-sm ${role === r.value ? 'font-semibold text-indigo-700' : 'text-gray-700'}`}
                    >
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Checkboxes */}
              <View className="bg-amber-50 rounded-xl p-4 mb-5 border border-amber-100">
                <Text className="text-sm font-bold text-amber-800 mb-3">
                  Please confirm the statements below:
                </Text>
                <Checkbox
                  checked={certify}
                  onPress={() => setCertify((v) => !v)}
                  label="I certify that I am an authorised representative or affiliate of this establishment and have the authority to register as a business representative. The information I have entered is neither false nor fraudulent."
                />
                <Checkbox
                  checked={agreeTerms}
                  onPress={() => setAgreeTerms((v) => !v)}
                  labelElement={
                    <Text style={{ fontSize: 13, color: '#374151', lineHeight: 20 }}>
                      I have read and accept HashView's{' '}
                      <Text
                        onPress={() => navigation.navigate('TermsAndConditions')}
                        style={{
                          color: '#4F46E5',
                          fontWeight: '700',
                          textDecorationLine: 'underline',
                        }}
                      >
                        Terms & Conditions
                      </Text>{' '}
                      and Privacy Policy.
                    </Text>
                  }
                />
              </View>

              <TouchableOpacity onPress={handleSubmitClaim} disabled={loading} activeOpacity={0.85}>
                <LinearGradient
                  colors={['#4F46E5', '#2D1B69']}
                  className="py-4 rounded-xl items-center"
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-bold text-base">Submit & Continue</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* ───── STEP 2: VERIFY IDENTITY ───── */}
          {step === 2 && (
            <View className="pb-8">
              <Text className="text-2xl font-bold text-gray-900 mb-1 mt-2">
                Verify your identity
              </Text>
              <Text className="text-sm text-gray-500 mb-6">
                Identity verification provides a higher level of security and helps HashView prevent
                fraud. Choose a method to confirm your identity.
              </Text>

              {/* Option A: Document + Selfie */}
              <TouchableOpacity
                onPress={() => setVerifyMethod('document')}
                activeOpacity={0.8}
                className={`rounded-2xl border-2 p-4 mb-4 ${
                  verifyMethod === 'document'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <View className="flex-row items-center mb-3">
                  <View
                    className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                      verifyMethod === 'document' ? 'border-indigo-600' : 'border-gray-300'
                    }`}
                  >
                    {verifyMethod === 'document' && (
                      <View className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                    )}
                  </View>
                  <Text className="text-base font-bold text-gray-900">
                    Verify by Photo ID & Selfie
                  </Text>
                </View>

                {/* Step sub-items */}
                <View className="ml-8 space-y-2">
                  <View className="flex-row items-start">
                    <Icon
                      name="card-outline"
                      size={18}
                      color="#6366F1"
                      style={{ marginTop: 1, marginRight: 8 }}
                    />
                    <View>
                      <Text className="text-sm font-semibold text-gray-800">
                        Step 1: Upload Photo ID
                      </Text>
                      <Text className="text-xs text-gray-500">
                        Required: passport, driver's licence, or government-issued photo ID
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-start">
                    <Icon
                      name="camera-outline"
                      size={18}
                      color="#6366F1"
                      style={{ marginTop: 1, marginRight: 8 }}
                    />
                    <View>
                      <Text className="text-sm font-semibold text-gray-800">
                        Step 2: Take a live selfie
                      </Text>
                      <Text className="text-xs text-gray-500">
                        Required: a well-lit photo taken with your device camera
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Option B: Phone OTP */}
              <TouchableOpacity
                onPress={() => setVerifyMethod('phone')}
                activeOpacity={0.8}
                className={`rounded-2xl border-2 p-4 mb-6 ${
                  verifyMethod === 'phone'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <View className="flex-row items-center mb-1">
                  <View
                    className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                      verifyMethod === 'phone' ? 'border-indigo-600' : 'border-gray-300'
                    }`}
                  >
                    {verifyMethod === 'phone' && (
                      <View className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                    )}
                  </View>
                  <Text className="text-base font-bold text-gray-900">Verify by Phone</Text>
                </View>
                <Text className="text-xs text-gray-500 ml-8">
                  Receive a verification code to your registered phone number.
                </Text>
              </TouchableOpacity>

              {/* ── Document upload UI ── */}
              {verifyMethod === 'document' && (
                <View className="space-y-4 mb-6">
                  {/* ID Proof */}
                  <View>
                    <Text className="text-sm font-semibold text-gray-700 mb-2">Photo ID</Text>
                    <TouchableOpacity
                      onPress={() => pickImage(setIdPhoto)}
                      activeOpacity={0.8}
                      className="border-2 border-dashed border-indigo-300 bg-indigo-50 rounded-xl items-center py-4"
                    >
                      {idPhoto ? (
                        <Image
                          source={{ uri: idPhoto.uri }}
                          className="w-full h-40 rounded-lg"
                          resizeMode="cover"
                        />
                      ) : (
                        <>
                          <Icon name="cloud-upload-outline" size={28} color="#6366F1" />
                          <Text className="text-indigo-600 font-semibold text-sm mt-1">
                            Upload Photo ID
                          </Text>
                          <Text className="text-gray-400 text-xs">JPG, PNG or PDF</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    {idPhoto && (
                      <TouchableOpacity onPress={() => setIdPhoto(null)} className="mt-1 items-end">
                        <Text className="text-xs text-red-500">Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Selfie */}
                  <View>
                    <Text className="text-sm font-semibold text-gray-700 mb-2">Live Selfie</Text>
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        onPress={() => takePhoto(setSelfie)}
                        activeOpacity={0.8}
                        className="flex-1 border-2 border-dashed border-indigo-300 bg-indigo-50 rounded-xl items-center py-4"
                      >
                        <Icon name="camera-outline" size={24} color="#6366F1" />
                        <Text className="text-indigo-600 font-semibold text-xs mt-1">
                          Take Selfie
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => pickImage(setSelfie)}
                        activeOpacity={0.8}
                        className="flex-1 border-2 border-dashed border-gray-300 bg-gray-50 rounded-xl items-center py-4"
                      >
                        <Icon name="image-outline" size={24} color="#9CA3AF" />
                        <Text className="text-gray-500 font-semibold text-xs mt-1">
                          Choose Photo
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {selfie && (
                      <View className="mt-2 items-center">
                        <Image
                          source={{ uri: selfie.uri }}
                          className="w-24 h-24 rounded-full border-2 border-indigo-300"
                        />
                        <TouchableOpacity onPress={() => setSelfie(null)} className="mt-1">
                          <Text className="text-xs text-red-500">Remove</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={handleUploadDocuments}
                    disabled={uploadingDocs}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={['#4F46E5', '#2D1B69']}
                      className="py-4 rounded-xl items-center"
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      {uploadingDocs ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <Text className="text-white font-bold text-base">Submit Documents</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}

              {/* ── Phone OTP UI ── */}
              {verifyMethod === 'phone' && (
                <View className="mb-6">
                  {!otpSent ? (
                    <>
                      <View className="bg-blue-50 rounded-xl p-4 mb-4 border border-blue-100">
                        <Text className="text-sm text-blue-700">
                          We'll send a 6-digit code to your registered email address (as an OTP).
                          Make sure you have access before continuing.
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={handleSendOtp}
                        disabled={sendingOtp}
                        activeOpacity={0.85}
                      >
                        <LinearGradient
                          colors={['#4F46E5', '#2D1B69']}
                          className="py-4 rounded-xl items-center"
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        >
                          {sendingOtp ? (
                            <ActivityIndicator color="white" />
                          ) : (
                            <Text className="text-white font-bold text-base">
                              Send Verification Code
                            </Text>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <Text className="text-sm text-gray-600 mb-3">
                        A 6-digit code has been sent to your registered email. Enter it below:
                      </Text>
                      <TextInput
                        value={otp}
                        onChangeText={setOtp}
                        placeholder="Enter 6-digit code"
                        keyboardType="number-pad"
                        maxLength={6}
                        className="border-2 border-indigo-200 bg-indigo-50 rounded-xl px-4 py-3.5 text-center text-2xl font-bold tracking-widest text-indigo-800 mb-4"
                      />
                      <TouchableOpacity
                        onPress={handleVerifyOtp}
                        disabled={verifyingOtp}
                        activeOpacity={0.85}
                      >
                        <LinearGradient
                          colors={['#4F46E5', '#2D1B69']}
                          className="py-4 rounded-xl items-center"
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        >
                          {verifyingOtp ? (
                            <ActivityIndicator color="white" />
                          ) : (
                            <Text className="text-white font-bold text-base">Verify Code</Text>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleSendOtp}
                        disabled={sendingOtp}
                        className="mt-3 items-center"
                      >
                        <Text className="text-indigo-600 text-sm font-medium">Resend Code</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}

              {/* Skip verification (show in case needed) */}
              {!verifyMethod && (
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert(
                      'Choose a method',
                      'Please select a verification method above before continuing.'
                    )
                  }
                  activeOpacity={0.85}
                >
                  <View className="py-4 rounded-xl items-center bg-gray-200">
                    <Text className="text-gray-500 font-bold text-base">Continue</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ───── STEP 3: SUCCESS ───── */}
          {step === 3 && (
            <View className="pb-8 items-center pt-4">
              <View className="w-24 h-24 rounded-full bg-green-100 items-center justify-center mb-6">
                <Icon name="checkmark-circle" size={52} color="#22C55E" />
              </View>
              <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
                Claim Submitted!
              </Text>
              <Text className="text-sm text-gray-500 text-center mb-8 leading-5 px-4">
                Your claim for <Text className="font-semibold text-gray-800">{business.name}</Text>{' '}
                has been submitted successfully.{'\n\n'}
                Our team will review your request and identity documents within 1-3 business days.
                You'll receive an email notification once a decision is made.
              </Text>

              <View className="bg-amber-50 rounded-2xl p-4 w-full mb-8 border border-amber-100">
                <Text className="text-sm font-bold text-amber-800 mb-2">What happens next?</Text>
                <View className="space-y-1.5">
                  {[
                    '📋 Our team reviews your claim and documents',
                    "✉️ You'll receive an email with the decision",
                    '✅ Once approved, you can manage your business profile',
                  ].map((t, i) => (
                    <Text key={i} className="text-xs text-amber-700 leading-4">
                      {t}
                    </Text>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                onPress={() => navigation.goBack()}
                activeOpacity={0.85}
                className="w-full"
              >
                <LinearGradient
                  colors={['#4F46E5', '#2D1B69']}
                  className="py-4 rounded-xl items-center"
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text className="text-white font-bold text-base">Back to Business</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
