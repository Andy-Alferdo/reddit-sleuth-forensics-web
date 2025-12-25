import { useEffect, useState } from 'react';
import mascotLogo from '@/assets/reddit-sleuth-mascot.png';

interface FloatingLogo {
  id: number;
  x: number;
  y: number;
  delay: number;
  size: number;
  rotation: number;
}

const MovingBackground = () => {
  const [logos, setLogos] = useState<FloatingLogo[]>([]);

  useEffect(() => {
    const generateLogos = () => {
      const newLogos: FloatingLogo[] = [];
      for (let i = 0; i < 15; i++) {
        newLogos.push({
          id: i,
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          delay: Math.random() * 15,
          size: 20 + Math.random() * 40,
          rotation: Math.random() * 30 - 15
        });
      }
      setLogos(newLogos);
    };

    generateLogos();
    window.addEventListener('resize', generateLogos);
    return () => window.removeEventListener('resize', generateLogos);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {logos.map((logo) => (
        <img
          key={logo.id}
          src={mascotLogo}
          alt=""
          className="absolute opacity-15 animate-float-diagonal drop-shadow-[0_0_8px_rgba(255,85,0,0.3)]"
          style={{
            left: `${logo.x}px`,
            top: `${logo.y}px`,
            width: `${logo.size}px`,
            height: `${logo.size}px`,
            animationDelay: `${logo.delay}s`,
            transform: `rotate(${logo.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
};

export default MovingBackground;