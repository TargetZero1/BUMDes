import logo from '../assets/logo.png';

export default function EmblemBadge({ className = 'h-20 w-20' }) {
  return <img src={logo} alt="Logo BUMDes Mulyo Sejahtera Abadi" className={`shrink-0 object-contain ${className}`} />;
}
