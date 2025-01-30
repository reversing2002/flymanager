import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import PersonIcon from '@mui/icons-material/Person';
import SubjectIcon from '@mui/icons-material/Subject';
import MessageIcon from '@mui/icons-material/Message';
import { TextField, Button, CircularProgress } from "@mui/material";
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import AviationImage from '../common/AviationImage';
import { useTranslation } from 'react-i18next';
import PageSEO from '../SEO/PageSEO';

const ContactPage: React.FC = () => {
  const { t } = useTranslation();
  const [showCustomSubject, setShowCustomSubject] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const CONTACT_REASONS = [
    t('contactPage.form.contactReason.options.general'),
    t('contactPage.form.contactReason.options.login'),
    t('contactPage.form.contactReason.options.payment'),
    t('contactPage.form.contactReason.options.bug'),
    t('contactPage.form.contactReason.options.partnership'),
    t('contactPage.form.contactReason.options.training'),
    t('contactPage.form.contactReason.options.reservations'),
    t('contactPage.form.contactReason.options.improvement'),
    t('contactPage.form.contactReason.options.other')
  ] as const;

  const contactSchema = z.object({
    name: z.string().min(2, t('contactPage.form.name.error')),
    email: z.string()
      .transform(e => e === "" ? undefined : e)
      .pipe(
        z.string()
          .email(t('contactPage.form.email.error'))
          .optional()
      ),
    phone: z.string()
      .transform(p => p === "" ? undefined : p)
      .pipe(
        z.string()
          .regex(/^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/, t('contactPage.form.phone.error'))
          .optional()
      ),
    contactReason: z.enum(CONTACT_REASONS),
    customSubject: z.string().min(3, t('contactPage.form.customSubject.error')).optional(),
    message: z.string().min(10, t('contactPage.form.message.error')),
  }).refine((data) => data.email || data.phone, {
    message: t('contactPage.form.contactRequiredError'),
    path: ["email"]
  });

  const backgroundImages = [
    'contact-1.png',
    'contact-2.png',
    'contact-3.png',
    'contact-4.png',
    'contact-5.png',
    'contact-6.png',
    'contact-7.png',
    'contact-8.png'
  ];

  const randomImage = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * backgroundImages.length);
    return backgroundImages[randomIndex];
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isValid, dirtyFields },
  } = useForm({
    resolver: zodResolver(contactSchema),
    mode: "onChange",
    defaultValues: {
      contactReason: t('contactPage.form.contactReason.options.general')
    }
  });

  const selectedReason = watch('contactReason');
  const watchEmail = watch("email");
  const watchPhone = watch("phone");

  React.useEffect(() => {
    setShowCustomSubject(selectedReason === t('contactPage.form.contactReason.options.other'));
  }, [selectedReason]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('contact_messages')
        .insert([
          {
            name: data.name,
            email: data.email || null,
            phone: data.phone || null,
            subject: data.contactReason === t('contactPage.form.contactReason.options.other') ? data.customSubject : data.contactReason,
            message: data.message,
          },
        ]);

      if (error) throw error;

      toast.success(t('contactPage.form.success'));
      reset();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(t('contactPage.form.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageSEO pageType="contact" />
      <div className="min-h-screen bg-gradient-to-br from-[#1a1d21] to-[#2a2e33] flex">
        {/* Partie gauche - Formulaire */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full lg:w-1/2 flex flex-col justify-center p-8 sm:p-12 lg:p-16"
        >
          <div className="w-full max-w-md mx-auto">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-8"
            >
              <h1 className="text-4xl font-bold text-white mb-3">{t('contactPage.hero.title')}</h1>
              <p className="text-gray-400 text-lg">
                {t('contactPage.hero.subtitle')}
              </p>
            </motion.div>

            <motion.form 
              onSubmit={handleSubmit(onSubmit)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-6"
            >
              <TextField
                fullWidth
                label={t('contactPage.form.name.label')}
                variant="outlined"
                {...register('name')}
                error={!!errors.name}
                helperText={errors.name?.message}
                InputProps={{
                  startAdornment: <PersonIcon className="mr-2 text-gray-400" />,
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                    backgroundColor: 'rgba(255,255,255,0.05)',
                  },
                  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                  '& .MuiOutlinedInput-input': { color: 'white' },
                  '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.6)' },
                }}
              />

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <div className="contact-field-wrapper">
                  <TextField
                    fullWidth
                    label={t('contactPage.form.email.label')}
                    variant="outlined"
                    {...register("email")}
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    InputProps={{
                      startAdornment: <EmailIcon className="text-gray-400 mr-2" />,
                    }}
                    placeholder={t('contactPage.form.email.placeholder')}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                        '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                        backgroundColor: 'rgba(255,255,255,0.05)',
                      },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                      '& .MuiOutlinedInput-input': { color: 'white' },
                      '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.6)' },
                    }}
                  />
                  {watchEmail && !errors.email && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-green-500 text-sm mt-1"
                    >
                      {t('contactPage.form.email.valid')}
                    </motion.div>
                  )}
                </div>

                <div className="contact-field-wrapper">
                  <TextField
                    fullWidth
                    label={t('contactPage.form.phone.label')}
                    variant="outlined"
                    {...register("phone")}
                    error={!!errors.phone}
                    helperText={errors.phone?.message}
                    InputProps={{
                      startAdornment: <PhoneIcon className="text-gray-400 mr-2" />,
                    }}
                    placeholder={t('contactPage.form.phone.placeholder')}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                        '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                        backgroundColor: 'rgba(255,255,255,0.05)',
                      },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                      '& .MuiOutlinedInput-input': { color: 'white' },
                      '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.6)' },
                    }}
                  />
                  {watchPhone && !errors.phone && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-green-500 text-sm mt-1"
                    >
                      {t('contactPage.form.phone.valid')}
                    </motion.div>
                  )}
                </div>
              </motion.div>

              {!watchEmail && !watchPhone && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-amber-500 text-sm text-center mt-2"
                >
                  {t('contactPage.form.contactRequired')}
                </motion.div>
              )}

              <TextField
                select
                fullWidth
                label={t('contactPage.form.contactReason.label')}
                variant="outlined"
                {...register('contactReason')}
                error={!!errors.contactReason}
                helperText={errors.contactReason?.message}
                SelectProps={{
                  native: true,
                }}
                InputProps={{
                  startAdornment: <SubjectIcon className="mr-2 text-gray-400" />,
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                    backgroundColor: 'rgba(255,255,255,0.05)',
                  },
                  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                  '& .MuiOutlinedInput-input': { color: 'white' },
                  '& .MuiSelect-select': { color: 'white' },
                  '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.6)' },
                }}
              >
                {CONTACT_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </TextField>

              {showCustomSubject && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <TextField
                    fullWidth
                    label={t('contactPage.form.customSubject.label')}
                    variant="outlined"
                    {...register('customSubject')}
                    error={!!errors.customSubject}
                    helperText={errors.customSubject?.message}
                    InputProps={{
                      startAdornment: <SubjectIcon className="mr-2 text-gray-400" />,
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                        '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                        backgroundColor: 'rgba(255,255,255,0.05)',
                      },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                      '& .MuiOutlinedInput-input': { color: 'white' },
                      '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.6)' },
                    }}
                  />
                </motion.div>
              )}

              <TextField
                fullWidth
                label={t('contactPage.form.message.label')}
                variant="outlined"
                multiline
                rows={4}
                {...register('message')}
                error={!!errors.message}
                helperText={errors.message?.message}
                InputProps={{
                  startAdornment: (
                    <MessageIcon className="mr-2 text-gray-400 absolute top-3 left-3" />
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                    backgroundColor: 'rgba(255,255,255,0.05)',
                  },
                  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                  '& .MuiOutlinedInput-input': { 
                    color: 'white',
                    paddingLeft: '2.5rem',
                  },
                  '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.6)' },
                }}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 py-3 rounded-lg transition-all duration-300 transform hover:scale-[1.02]"
                sx={{ textTransform: 'none', fontSize: '1rem' }}
              >
                {isSubmitting ? (
                  <CircularProgress size={24} className="text-white" />
                ) : (
                  t('contactPage.form.submit')
                )}
              </Button>
            </motion.form>
          </div>
        </motion.div>

        {/* Partie droite - Image de fond */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="hidden lg:block lg:w-1/2 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30 backdrop-blur-[2px] z-10" />
          <AviationImage
            imageName={randomImage}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-12">
            <div className="max-w-xl text-center">
              <h2 className="text-3xl font-bold text-white mb-4">
                {t('contactPage.hero.needHelp')}
              </h2>
              <p className="text-xl text-gray-300">
                {t('contactPage.hero.supportMessage')}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default ContactPage;
