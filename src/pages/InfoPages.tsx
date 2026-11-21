import React, { useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { db } from '../firebase';
import { useStore } from '../context/StoreContext';
import { FAQ_ITEMS } from '../data/seedCatalog';
import { formatWhatsAppUrl } from '../types';

export const AboutPage: React.FC = () => {
  const { storeSettings } = useStore();
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div className="rounded-2xl overflow-hidden bg-[#111317] border border-zinc-800">
        <img
          src={storeSettings.bannerUrl || '/assets/aistudio/velloxb_5c666189.jpg'}
          alt="VELLOX Brand Showcase"
          referrerPolicy="no-referrer"
          className="w-full h-auto object-cover"
        />
      </div>

      <div className="space-y-4">
        <h1 className="font-display text-3xl font-bold text-[#111317]">About VELLOX</h1>
        <p className="text-base text-zinc-700 leading-relaxed">
          VELLOX is a modern direct-to-consumer retail brand built in Pakistan around a simple standard: everyday objects should feel engineered, understated, and dependable.
        </p>
        <p className="text-base text-zinc-700 leading-relaxed">
          From cordless architectural desk lamps and active noise-cancelling earbuds to barista-grade milk frothers and solid walnut workspace organizers, every item in our catalog is individually inspected before dispatch and backed by nationwide Cash on Delivery.
        </p>
      </div>
    </div>
  );
};

export const ContactPage: React.FC = () => {
  const { storeSettings, showToast } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await setDoc(doc(db, 'contactMessages', msgId), {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        subject: subject.trim(),
        message: message.trim(),
        status: 'new',
        createdAt: serverTimestamp(),
      });
      setSent(true);
      setName('');
      setEmail('');
      setPhone('');
      setSubject('');
      setMessage('');
      showToast('Message sent to VELLOX support.');
    } catch {
      showToast('Unable to send message. Please use WhatsApp or email directly.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-5 space-y-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-[#111317]">Contact VELLOX</h1>
            <p className="text-sm text-zinc-600 mt-2">
              Questions about product compatibility, bulk orders, or an existing shipment? Reach us directly.
            </p>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-4 text-sm">
            <a
              href={formatWhatsAppUrl(
                storeSettings.whatsappNumber || '03014426490',
                'Hello VELLOX Support, I have a question.'
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 font-semibold hover:bg-emerald-100 transition-colors"
            >
              <MessageCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Chat on WhatsApp ({storeSettings.phone || '+92 301 4426490'})</span>
            </a>

            <div className="flex items-center gap-3 text-zinc-700">
              <Phone className="w-4 h-4 text-zinc-500 shrink-0" />
              <span className="font-mono">{storeSettings.whatsappNumber || '03014426490'}</span>
            </div>
            <div className="flex items-center gap-3 text-zinc-700">
              <Mail className="w-4 h-4 text-zinc-500 shrink-0" />
              <span>{storeSettings.contactEmail || 'vellox.store.pk@gmail.com'}</span>
            </div>
            <div className="flex items-center gap-3 text-zinc-700">
              <MapPin className="w-4 h-4 text-zinc-500 shrink-0" />
              <span>{storeSettings.address || 'Sheikhupura, Pakistan'}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="lg:col-span-7 bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="font-display text-xl font-bold text-[#111317]">Send a Message</h2>

          {sent && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
              Thank you! Your inquiry has been received and our team will reply shortly.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-zinc-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Email *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-zinc-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-zinc-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Subject *</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-zinc-300 rounded-lg"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Message *</label>
              <textarea
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-zinc-300 rounded-lg"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={sending}
            className="px-6 py-2.5 bg-[#111317] text-white text-sm font-semibold rounded-lg hover:bg-zinc-800 transition-colors"
          >
            {sending ? 'Sending...' : 'Submit Inquiry'}
          </button>
        </form>
      </div>
    </div>
  );
};

export const FaqPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-display text-3xl font-bold text-[#111317]">Frequently Asked Questions</h1>
      <p className="text-sm text-zinc-600 mt-1">
        Everything you need to know about Cash on Delivery, shipping times, and returns.
      </p>

      <div className="mt-8 space-y-4">
        {FAQ_ITEMS.map((item, idx) => (
          <div key={idx} className="bg-white border border-zinc-200 rounded-xl p-6">
            <h2 className="font-display text-base font-bold text-[#111317]">{item.q}</h2>
            <p className="mt-2 text-sm text-zinc-600 leading-relaxed">{item.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export const PolicyPage: React.FC<{
  type: 'privacy' | 'return' | 'terms' | 'shipping';
}> = ({ type }) => {
  const { storeSettings } = useStore();
  const titleMap = {
    privacy: 'Privacy Policy',
    return: 'Return & Refund Policy',
    terms: 'Terms & Conditions',
    shipping: 'Shipping Policy',
  };
  const bodyMap = {
    privacy: storeSettings.privacyPolicy,
    return: storeSettings.returnPolicy,
    terms: storeSettings.termsConditions,
    shipping: storeSettings.shippingPolicy,
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-display text-3xl font-bold text-[#111317]">{titleMap[type]}</h1>
      <div className="mt-6 bg-white border border-zinc-200 rounded-xl p-6 sm:p-8 text-sm text-zinc-700 leading-relaxed whitespace-pre-line">
        {bodyMap[type]}
      </div>
    </div>
  );
};
