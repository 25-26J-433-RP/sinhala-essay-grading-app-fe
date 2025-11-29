import AppHeader from '@/components/AppHeader';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function AddStudentScreen() {
  const [studentId, setStudentId] = useState('');
  const [studentAge, setStudentAge] = useState('');
  const [studentGrade, setStudentGrade] = useState('');
  const [studentGender, setStudentGender] = useState('');
  const [showGradeDropdown, setShowGradeDropdown] = useState(false);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [saving, setSaving] = useState(false);

  const { user } = useAuth();
  const { t } = useLanguage();
  const gradeOptions = ['Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8'];
  const genderOptions = [t('addStudent.male'), t('addStudent.female')];

  const handleSaveStudent = async () => {
    // Validate all fields
    if (!studentId.trim()) {
      Alert.alert(t('addStudent.validation'), t('addStudent.enterIdRequired'));
      return;
    }
    if (!studentAge.trim()) {
      Alert.alert(t('addStudent.validation'), t('addStudent.enterAgeRequired'));
      return;
    }
    if (!studentGrade) {
      Alert.alert(t('addStudent.validation'), t('addStudent.selectGradeRequired'));
      return;
    }
    if (!studentGender) {
      Alert.alert(t('addStudent.validation'), t('addStudent.selectGenderRequired'));
      return;
    }

    if (!user) {
      Alert.alert(t('common.error'), t('addStudent.mustBeLoggedIn'));
      return;
    }

    if (!db) {
      Alert.alert(t('common.error'), t('addStudent.databaseNotInitialized'));
      return;
    }

    setSaving(true);

    try {
      // Check if student ID already exists for this user
      const studentsRef = collection(db, 'students');
      const q = query(
        studentsRef,
        where('userId', '==', user.uid),
        where('studentId', '==', studentId.trim())
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        Alert.alert(t('addStudent.duplicate'), t('addStudent.studentExists'));
        setSaving(false);
        return;
      }

      // Add new student
      await addDoc(studentsRef, {
        userId: user.uid,
        studentId: studentId.trim(),
        studentAge: parseInt(studentAge.trim(), 10),
        studentGrade: studentGrade.trim(),
        studentGender: studentGender.trim(),
        createdAt: new Date(),
      });

      Alert.alert(t('common.success'), t('addStudent.studentAdded'), [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);

      // Clear form
      setStudentId('');
      setStudentAge('');
      setStudentGrade('');
      setStudentGender('');
    } catch (error) {
      console.error('Error adding student:', error);
      Alert.alert(t('common.error'), t('addStudent.failedToAdd'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <AppHeader />

      <View style={styles.content}>
        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
          <Text style={styles.backButtonText}>{t('common.back')}</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <MaterialIcons name="person-add" size={48} color="#007AFF" />
          <Text style={styles.title}>{t('addStudent.title')}</Text>
          <Text style={styles.subtitle}>{t('addStudent.subtitle')}</Text>
        </View>

        {/* Form */}
        <View style={styles.formCard}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('addStudent.studentId')} *</Text>
            <TextInput
              value={studentId}
              onChangeText={setStudentId}
              placeholder={t('addStudent.enterStudentId')}
              placeholderTextColor="#888"
              style={styles.input}
              autoCapitalize="none"
              editable={!saving}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('addStudent.studentAge')} *</Text>
            <TextInput
              value={studentAge}
              onChangeText={setStudentAge}
              placeholder={t('addStudent.enterStudentAge')}
              placeholderTextColor="#888"
              style={styles.input}
              keyboardType="numeric"
              editable={!saving}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('addStudent.studentGrade')} *</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => !saving && setShowGradeDropdown(!showGradeDropdown)}
              disabled={saving}
            >
              <Text style={[styles.dropdownButtonText, !studentGrade && styles.placeholderText]}>
                {studentGrade || t('addStudent.selectGrade')}
              </Text>
              <Text style={styles.dropdownArrow}>{showGradeDropdown ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showGradeDropdown && (
              <View style={styles.dropdownList}>
                {gradeOptions.map((grade) => (
                  <TouchableOpacity
                    key={grade}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setStudentGrade(grade);
                      setShowGradeDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{grade}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('addStudent.studentGender')} *</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => !saving && setShowGenderDropdown(!showGenderDropdown)}
              disabled={saving}
            >
              <Text style={[styles.dropdownButtonText, !studentGender && styles.placeholderText]}>
                {studentGender || t('addStudent.selectGender')}
              </Text>
              <Text style={styles.dropdownArrow}>{showGenderDropdown ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showGenderDropdown && (
              <View style={styles.dropdownList}>
                {genderOptions.map((gender) => (
                  <TouchableOpacity
                    key={gender}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setStudentGender(gender);
                      setShowGenderDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{gender}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSaveStudent}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="save" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>{t('addStudent.saveStudent')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181A20',
  },
  content: {
    padding: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    marginLeft: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    color: '#B0B3C6',
    fontSize: 14,
  },
  formCard: {
    backgroundColor: '#23262F',
    borderRadius: 12,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#B0B3C6',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#181A20',
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333640',
    fontSize: 16,
  },
  dropdownButton: {
    backgroundColor: '#181A20',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333640',
  },
  dropdownButtonText: {
    color: '#fff',
    flex: 1,
    fontSize: 16,
  },
  placeholderText: {
    color: '#888',
  },
  dropdownArrow: {
    color: '#fff',
    fontSize: 12,
  },
  dropdownList: {
    backgroundColor: '#181A20',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333640',
    marginTop: 8,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333640',
  },
  dropdownItemText: {
    color: '#fff',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
    marginTop: 12,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
