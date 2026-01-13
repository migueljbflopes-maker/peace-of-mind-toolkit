import { Link } from "react-router-dom";

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  linkTo?: string;
}

const sizeConfig = {
  sm: { height: 24, textClass: 'text-sm' },
  md: { height: 32, textClass: 'text-base' },
  lg: { height: 48, textClass: 'text-xl' },
};

export function Logo({ size = 'md', showText = true, linkTo }: LogoProps) {
  const { height, textClass } = sizeConfig[size];
  const width = height * 0.85; // Shield aspect ratio

  const LogoContent = (
    <div className="flex items-center gap-2">
      {/* Shield SVG */}
      <svg
        width={width}
        height={height}
        viewBox="0 0 85 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <defs>
          <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>
          <clipPath id="shieldClip">
            <path d="M42.5 0C20 0 0 10 0 10V55C0 75 42.5 100 42.5 100C42.5 100 85 75 85 55V10C85 10 65 0 42.5 0Z" />
          </clipPath>
        </defs>
        
        {/* Shield base */}
        <path
          d="M42.5 0C20 0 0 10 0 10V55C0 75 42.5 100 42.5 100C42.5 100 85 75 85 55V10C85 10 65 0 42.5 0Z"
          fill="url(#shieldGradient)"
        />
        
        {/* Diagonal stripes */}
        <g clipPath="url(#shieldClip)">
          <line x1="-10" y1="25" x2="40" y2="-25" stroke="white" strokeWidth="8" strokeOpacity="0.3" />
          <line x1="10" y1="45" x2="60" y2="-5" stroke="white" strokeWidth="8" strokeOpacity="0.3" />
          <line x1="30" y1="65" x2="80" y2="15" stroke="white" strokeWidth="8" strokeOpacity="0.3" />
          <line x1="50" y1="85" x2="100" y2="35" stroke="white" strokeWidth="8" strokeOpacity="0.3" />
        </g>
      </svg>

      {/* Text */}
      {showText && (
        <span className={`font-bold text-foreground ${textClass}`}>
          am-i-ready.com
        </span>
      )}
    </div>
  );

  if (linkTo) {
    return (
      <Link to={linkTo} className="flex items-center group">
        {LogoContent}
      </Link>
    );
  }

  return LogoContent;
}

export default Logo;
