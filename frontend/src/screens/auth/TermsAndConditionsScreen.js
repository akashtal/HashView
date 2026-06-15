import React, { useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, SafeAreaView } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import COLORS from '../../config/colors';

const SECTIONS = [
  {
    number: '1',
    title: 'Acceptance of Terms',
    body: 'By accessing or using the HASHVIEW website or mobile application ("Platform", "App", "Site"), you agree to be bound by these Terms and Conditions ("Terms"). If you do not agree, you must not use the Platform.',
  },
  {
    number: '2',
    title: 'About HASHVIEW',
    body: 'HASHVIEW is a review, discovery, and customer engagement platform designed for restaurants, hotels, cafés, and hospitality businesses ("Venues"). The Platform may display venue listings, reviews, ratings, images, offers, and related content.',
  },
  {
    number: '3',
    title: 'Public Venue Profiles',
    subsections: [
      {
        title: '3.1 Creation of Profiles',
        body: 'HASHVIEW may create and display public profiles for Venues using publicly available information, third party sources, or user contributions. Profiles may include business name, address, contact details, descriptions, photos, reviews, and ratings.',
      },
      {
        title: '3.2 Accuracy of Information',
        body: 'While we aim for accuracy, HASHVIEW does not guarantee that venue information is complete, accurate, or up to date.',
      },
      {
        title: '3.3 Claiming a Venue Profile',
        body: 'If a Venue profile already exists, an authorised business representative may claim it by providing required verification details such as name, business email, phone number, proof of identity, and proof of business ownership or address. HASHVIEW reserves the right to approve or reject claims.',
      },
      {
        title: '3.4 Responsibilities of Claimed Profiles',
        body: 'Once claimed, representatives must ensure profile information remains accurate and are responsible for updates made via the business account. Businesses agree not to submit false information, misuse review systems, or harass users. Violations may result in suspension or termination.',
      },
    ],
  },
  {
    number: '4',
    title: 'User Accounts',
    body: 'Users may be required to register an account to access certain features. You agree to provide accurate information, maintain security of credentials, and accept responsibility for activities under your account.',
  },
  {
    number: '5',
    title: 'User Generated Content (UGC)',
    subsections: [
      {
        title: '5.1 Responsibility',
        body: 'Users are solely responsible for content they post, including reviews, ratings, comments, and images. HASHVIEW is not responsible for user generated content.',
      },
      {
        title: '5.2 Content Rules',
        body: 'You must not post content that is false, defamatory, abusive, misleading, fraudulent, infringing, or illegal.',
      },
      {
        title: '5.3 Licence',
        body: 'By posting content, you grant HASHVIEW a worldwide, royalty free, perpetual licence to use, reproduce, display, and distribute your content. HASHVIEW may moderate or remove content at its discretion.',
      },
    ],
  },
  {
    number: '6',
    title: 'Reviews & Ratings',
    body: 'Reviews reflect individual opinions. HASHVIEW does not endorse user views. Businesses must not manipulate reviews. Fake or misleading reviews are prohibited.',
  },
  {
    number: '7',
    title: 'Verified Review Features',
    body: 'HASHVIEW may use verification technologies such as QR codes or geofencing. Verification indicates visit validation only and does not guarantee review accuracy.',
  },
  {
    number: '8',
    title: 'Business Conduct',
    body: 'Businesses agree not to submit false information, misuse review systems, or harass users. Violations may result in suspension or termination.',
  },
  {
    number: '9',
    title: 'Intellectual Property',
    body: 'All Platform content excluding UGC is owned by The Hashtag Services Ltd and protected by intellectual property laws. Unauthorised copying or distribution is prohibited.',
  },
  {
    number: '10',
    title: 'Disclaimers',
    body: 'The Platform is provided "as is". We do not guarantee uninterrupted service, error-free operation, or accuracy of content.',
  },
  {
    number: '11',
    title: 'Limitation of Liability',
    body: 'To the fullest extent permitted by law, HASHVIEW shall not be liable for indirect damages, loss of profits, reputation damage, or business interruption arising from Platform use.',
  },
  {
    number: '12',
    title: 'Third Party Links',
    body: 'HASHVIEW may contain third party links. We are not responsible for third party content or services.',
  },
  {
    number: '13',
    title: 'Termination',
    body: 'We reserve the right to suspend or terminate accounts or access at our discretion.',
  },
  {
    number: '14',
    title: 'Privacy',
    body: 'Use of HASHVIEW is also governed by our Privacy Policy.',
  },
  {
    number: '15',
    title: 'Changes to Terms',
    body: 'We may update these Terms at any time. Continued use constitutes acceptance.',
  },
  {
    number: '16',
    title: 'Governing Law',
    body: 'These Terms are governed by the laws of England and Wales.',
  },
  {
    number: '17',
    title: 'Contact Information',
    body: 'The Hashtag Services Ltd\nEmail: info@hashview.co.uk\nAddress: LL60 6AG\nWebsite: www.hashview.co.uk',
  },
];

export default function TermsAndConditionsScreen({ navigation }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={{ paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20 }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            position: 'absolute',
            top: 50,
            left: 20,
            backgroundColor: 'rgba(255,255,255,0.15)',
            borderRadius: 50,
            padding: 8,
          }}
        >
          <Icon name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={{ alignItems: 'center', marginTop: 8 }}>
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: 50,
              padding: 12,
              marginBottom: 10,
            }}
          >
            <Icon name="document-text" size={28} color="#fff" />
          </View>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' }}>
            Terms & Conditions
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 4 }}>
            Effective 08 July 2025 · The Hashtag Services Ltd
          </Text>
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro box */}
        <View
          style={{
            backgroundColor: '#F0EBFF',
            borderRadius: 12,
            padding: 14,
            marginBottom: 20,
            borderLeftWidth: 4,
            borderLeftColor: COLORS.primary,
          }}
        >
          <Text style={{ color: COLORS.primary, fontSize: 13, lineHeight: 20 }}>
            Please read these Terms and Conditions carefully before using the HASHVIEW platform. By
            creating an account or claiming a business, you agree to all the terms below.
          </Text>
        </View>

        {SECTIONS.map((section) => (
          <View key={section.number} style={{ marginBottom: 20 }}>
            {/* Section header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <View
                style={{
                  backgroundColor: COLORS.primary,
                  borderRadius: 20,
                  width: 28,
                  height: 28,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 10,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                  {section.number}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '700',
                  color: '#1a1a2e',
                  flex: 1,
                }}
              >
                {section.title}
              </Text>
            </View>

            {/* Body or subsections */}
            {section.body ? (
              <Text
                style={{
                  fontSize: 13.5,
                  color: '#444',
                  lineHeight: 21,
                  marginLeft: 38,
                }}
              >
                {section.body}
              </Text>
            ) : (
              section.subsections?.map((sub) => (
                <View key={sub.title} style={{ marginLeft: 38, marginBottom: 10 }}>
                  <Text
                    style={{
                      fontSize: 13.5,
                      fontWeight: '700',
                      color: '#333',
                      marginBottom: 4,
                    }}
                  >
                    {sub.title}
                  </Text>
                  <Text style={{ fontSize: 13.5, color: '#444', lineHeight: 21 }}>{sub.body}</Text>
                </View>
              ))
            )}

            {/* Divider */}
            <View
              style={{
                height: 1,
                backgroundColor: '#f0f0f0',
                marginTop: 12,
                marginLeft: 38,
              }}
            />
          </View>
        ))}

        {/* Footer */}
        <View
          style={{
            backgroundColor: '#F9F9FF',
            borderRadius: 12,
            padding: 16,
            marginTop: 8,
            borderWidth: 1,
            borderColor: '#e8e0ff',
          }}
        >
          <Text
            style={{
              textAlign: 'center',
              color: '#666',
              fontSize: 12,
              lineHeight: 18,
            }}
          >
            © {new Date().getFullYear()} The Hashtag Services Ltd · www.hashview.co.uk{'\n'}
            All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
