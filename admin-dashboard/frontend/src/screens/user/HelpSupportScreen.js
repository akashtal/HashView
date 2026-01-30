import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  StatusBar,
  Alert,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import { showMessage } from 'react-native-flash-message';
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';

export default function HelpSupportScreen({ navigation }) {
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [contactForm, setContactForm] = useState({
    subject: '',
    message: '',
  });
  const [sending, setSending] = useState(false);

  const faqs = [
    {
      id: 1,
      question: 'How do I write a review for a business?',
      answer: 'To write a review, navigate to the business detail page and tap the "Write Review" button. Make sure you\'re within the business location (geofence) to submit your review. You\'ll earn a discount coupon automatically after posting!'
    },
    {
      id: 2,
      question: 'How does the geofencing system work?',
      answer: 'Geofencing ensures authentic reviews by requiring you to be physically present at the business location. When you try to write a review, the app checks your GPS coordinates against the business location. You must be within the specified radius (usually 50 meters) to post a review.'
    },
    {
      id: 3,
      question: 'How do I redeem my discount coupons?',
      answer: 'Go to "My Coupons" from your profile, select the coupon you want to use, and show the QR code to the business staff. They\'ll scan it to verify and apply your discount. Note: Coupons are valid for 2 hours after earning them!'
    },
    {
      id: 4,
      question: 'Why did my coupon expire?',
      answer: 'Coupons are valid for 2 hours from the time you earn them. This encourages immediate visits and ensures coupons are used while the review experience is fresh. Make sure to redeem your coupons within this timeframe!'
    },
    {
      id: 5,
      question: 'Can I edit or delete my review?',
      answer: 'Yes! You can edit your review within 24 hours of posting it. Go to "My Reviews" in your profile, select the review, and choose "Edit". If you need to delete a review, contact our support team.'
    },
    {
      id: 6,
      question: 'How do I update my profile information?',
      answer: 'Tap on your profile icon, then select "Personal Information" to edit your name, email, phone number, and profile picture. Don\'t forget to save your changes!'
    },
    {
      id: 7,
      question: 'What if I can\'t find a business on the app?',
      answer: 'If a business isn\'t listed, they may not have registered yet. You can suggest they sign up as a business owner. Alternatively, search using different keywords or check the "Nearby" tab for businesses near your current location.'
    },
    {
      id: 8,
      question: 'How can I become a business owner on HashView?',
      answer: 'If you own a business, tap "Sign Up" and select "Business Owner" during registration. You\'ll need to complete a simple registration process including business details and document uploads.'
    },
    {
      id: 9,
      question: 'Is my location data safe?',
      answer: 'Yes! We only use your location data to enable the geofencing feature for reviews. Your location is not shared with other users or third parties. You can disable location services anytime in Settings.'
    },
    {
      id: 10,
      question: 'How do I report inappropriate content?',
      answer: 'If you see inappropriate reviews or content, tap the three-dot menu on the review and select "Report". Our moderation team will review it within 24 hours.'
    }
  ];


  const handleSubmitTicket = async () => {
    if (!contactForm.subject.trim() || !contactForm.message.trim()) {
      showMessage({
        message: 'Validation Error',
        description: 'Please fill in both subject and message',
        type: 'warning',
      });
      return;
    }

    try {
      setSending(true);

      // API call to submit support ticket
      await ApiService.submitSupportTicket(contactForm);

      showMessage({
        message: 'Ticket Submitted!',
        description: 'Our support team will get back to you within 24 hours',
        type: 'success',
      });

      // Clear form
      setContactForm({ subject: '', message: '' });

      setSending(false);
    } catch (error) {
      setSending(false);
      showMessage({
        message: 'Submission Failed',
        description: error.message || 'Failed to submit ticket',
        type: 'danger',
      });
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        className="pt-12 pb-6 px-6"
      >
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mr-4 w-10 h-10 rounded-full bg-white/20 items-center justify-center"
          >
            <Icon name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold flex-1">Help & Support</Text>
        </View>
      </LinearGradient>

      <ScrollView className="flex-1">
        <View className="px-6 py-4">
          {/* Submit Ticket Form */}
          <View className="bg-white rounded-2xl p-6 shadow-sm mb-4">
            <Text className="text-lg font-bold text-gray-900 mb-4">
              Submit a Ticket
            </Text>

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Subject</Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50"
                placeholder="Brief description of your issue"
                value={contactForm.subject}
                onChangeText={(text) => setContactForm({ ...contactForm, subject: text })}
                editable={!sending}
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Message</Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50"
                placeholder="Describe your issue in detail..."
                value={contactForm.message}
                onChangeText={(text) => setContactForm({ ...contactForm, message: text })}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                editable={!sending}
              />
            </View>

            <TouchableOpacity
              onPress={handleSubmitTicket}
              disabled={sending}
              className="rounded-xl py-4 items-center"
              style={{ backgroundColor: COLORS.primary }}
            >
              {sending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text className="text-white font-bold text-base">Submit Ticket</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* FAQs */}
          <View className="bg-white rounded-2xl p-6 shadow-sm mb-4">
            <Text className="text-lg font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </Text>

            {faqs.map((faq) => (
              <View key={faq.id} className="mb-3">
                <TouchableOpacity
                  onPress={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                  className="flex-row items-center justify-between py-3"
                >
                  <Text className="text-base font-medium text-gray-900 flex-1 mr-3">
                    {faq.question}
                  </Text>
                  <Icon
                    name={expandedFaq === faq.id ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={COLORS.primary}
                  />
                </TouchableOpacity>

                {expandedFaq === faq.id && (
                  <View className="pl-4 pr-2 pb-3">
                    <Text className="text-sm text-gray-600 leading-relaxed">
                      {faq.answer}
                    </Text>
                  </View>
                )}

                {faq.id < faqs.length && (
                  <View className="border-b border-gray-100" />
                )}
              </View>
            ))}
          </View>

          {/* App Info */}
          <View className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <Text className="text-lg font-bold text-gray-900 mb-4">
              App Information
            </Text>

            <View className="border-t border-gray-100 my-3" />

            <TouchableOpacity
              onPress={() => Linking.openURL('https://www.hashview.co.uk/privacy')}
              className="flex-row items-center justify-between py-2"
            >
              <Text className="text-gray-900">Privacy Policy</Text>
              <Icon name="open-outline" size={18} color="#D1D5DB" />
            </TouchableOpacity>

            <View className="border-t border-gray-100 my-3" />

            <TouchableOpacity
              onPress={() => Linking.openURL('https://www.hashview.co.uk/privacy')}
              className="flex-row items-center justify-between py-2"
            >
              <Text className="text-gray-900">Terms of Service</Text>
              <Icon name="open-outline" size={18} color="#D1D5DB" />
            </TouchableOpacity>

            <View className="border-t border-gray-100 my-3" />

            <TouchableOpacity
              onPress={() => Linking.openURL('https://www.hashview.co.uk')}
              className="flex-row items-center justify-between py-2"
            >
              <Text className="text-gray-900">Visit Website</Text>
              <Icon name="open-outline" size={18} color="#D1D5DB" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
