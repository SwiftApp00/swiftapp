import React from 'react';
import { Truck, Instagram, Mail, Phone } from 'lucide-react';

export function Footer() {
    return (
        <footer className="bg-[#8B0000] text-red-50 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">

                {/* Brand */}
                <div>
                    <div className="mb-6">
                        <img
                            src="https://atbocciidldnhaclyerh.supabase.co/storage/v1/object/public/assets/logoswift.png"
                            alt="Swift Transport & Solutions"
                            className="h-16 w-auto object-contain brightness-0 invert"
                        />
                    </div>
                    <p className="text-sm text-red-200 max-w-xs leading-relaxed">
                        Fast, reliable, and affordable transport solutions serving Dublin and nearby areas. Your trusted moving partner.
                    </p>
                </div>

                {/* Quick Links */}
                <div>
                    <h4 className="font-bold text-white mb-4 text-lg">Quick Links</h4>
                    <ul className="space-y-2 text-sm text-red-200">
                        <li><a href="#services" className="hover:text-white transition-colors">Our Services</a></li>
                        <li><a href="#quote" className="hover:text-white transition-colors">Request a Quote</a></li>
                        <li><a href="/login" className="hover:text-white transition-colors">Admin Portal</a></li>
                    </ul>
                </div>

                {/* Contact info */}
                <div id="contact">
                    <h4 className="font-bold text-white mb-4 text-lg">Contact Us</h4>
                    <ul className="space-y-3 test-sm text-red-200">
                        <li className="flex items-center gap-2">
                            <Phone size={16} />
                            <span>+353 83 375 8839</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <Mail size={16} />
                            <a href="mailto:contactswifttransport@gmail.com" className="hover:text-white transition-colors">
                                contactswifttransport@gmail.com
                            </a>
                        </li>
                        <li className="flex items-center gap-2">
                            <Instagram size={16} />
                            <a href="https://instagram.com/_swifttransport" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
                                @_swifttransport
                            </a>
                        </li>
                    </ul>
                </div>

            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-red-800 text-center text-xs text-red-300">
                &copy; {new Date().getFullYear()} Swift Transport & Solutions. All rights reserved.
            </div>
        </footer>
    );
}
