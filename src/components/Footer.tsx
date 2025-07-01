import { Mail, Phone, MapPin, Facebook, Twitter, Instagram } from 'lucide-react';

function Footer() {
  return (
    <footer className="bg-travelex-blue text-white py-12 px-8 md:px-16">
      <div className="px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Company Info */}
        <div>
          <h2 className="text-3xl font-bold mb-4 text-travelex-orange">TravelEx</h2>
          <p className="text-gray-300 py-2 leading-relaxed">
            Premium intercity travel between Ottawa and Toronto. Travel with the comfort of home.
          </p>
          <div className="mt-4 space-y-2 text-sm text-gray-300">
            <p>• No reservation fees</p>
            <p>• Free snacks & Wi-Fi</p>
            <p>• Premium comfort seating</p>
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <h3 className="text-2xl font-bold mb-4">Contact Us</h3>
          <ul className="space-y-3">
            <li className="flex items-center">
              <Phone className="h-5 w-5 mr-3 text-travelex-orange" />
              <span>+1 (343) 309-5825</span>
            </li>
            <li className="flex items-center">
              <Mail className="h-5 w-5 mr-3 text-travelex-orange" />
              <span>admin@travelexride.ca</span>
            </li>
            <li className="flex items-center">
              <MapPin className="h-5 w-5 mr-3 text-travelex-orange" />
              <span>Ottawa ↔ Toronto Corridor</span>
            </li>
          </ul>
        </div>

        {/* Social Media Links */}
        <div>
          <h3 className="text-2xl font-bold mb-4">Follow Us</h3>
          <div className="flex space-x-4">
            <a href="https://facebook.com" aria-label="Facebook" className="text-travelex-orange hover:text-white transition">
              <Facebook className="h-6 w-6" />
            </a>
            <a href="https://twitter.com" aria-label="Twitter" className="text-travelex-orange hover:text-white transition">
              <Twitter className="h-6 w-6" />
            </a>
            <a href="https://instagram.com" aria-label="Instagram" className="text-travelex-orange hover:text-white transition">
              <Instagram className="h-6 w-6" />
            </a>
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="text-center text-gray-400 text-sm mt-8 pt-8 border-t border-gray-600">
        <p>&copy; {new Date().getFullYear()} TravelEx. All rights reserved.</p>
        <p className="pt-2 text-xs"><a href="https://www.aliou.online" target="_blank" className="text-travelex-orange hover:text-white transition">@aliouuuw</a></p>
      </div>
    </footer>
  );
}

export default Footer;