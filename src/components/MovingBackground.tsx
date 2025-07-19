import { useEffect, useState } from 'react';
import redditIcon from '@/assets/reddit-icon.png';

interface FloatingIcon {
  id: number;
  x: number;
  y: number;
  delay: number;
  size: number;
}

const MovingBackground = () => {
  const [icons, setIcons] = useState<FloatingIcon[]>([]);

  useEffect(() => {
    const generateIcons = () => {
      const newIcons: FloatingIcon[] = [];
      for (let i = 0; i < 15; i++) {
        newIcons.push({
          id: i,
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          delay: Math.random() * 15,
          size: 20 + Math.random() * 40
        });
      }
      setIcons(newIcons);
    };

    generateIcons();
    window.addEventListener('resize', generateIcons);
    return () => window.removeEventListener('resize', generateIcons);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {icons.map((icon) => (
        <img
          key={icon.id}
          src={redditIcon}
          alt=""
          className="absolute opacity-20 animate-float-diagonal"
          style={{
            left: `${icon.x}px`,
            top: `${icon.y}px`,
            width: `${icon.size}px`,
            height: `${icon.size}px`,
            animationDelay: `${icon.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

export default MovingBackground;