import React, {useState} from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';

interface AudioArtworkProps {
  uri: string;
  title: string;
  size: number;
  accent: string;
  borderRadius?: number;
}

export const AudioArtwork: React.FC<AudioArtworkProps> = ({
  uri,
  title,
  size,
  accent,
  borderRadius = 26,
}) => {
  const [failed, setFailed] = useState(false);
  const initials = title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'A';

  return (
    <View style={[styles.frame, {width: size, height: size, borderRadius, backgroundColor: accent}]}> 
      {uri && !failed ? (
        <Image
          source={{uri}}
          resizeMode="cover"
          onError={() => setFailed(true)}
          style={[styles.image, {borderRadius}]}
          accessibilityLabel={`${title} artwork`}
        />
      ) : (
        <View style={styles.fallback} accessible accessibilityLabel={`${title} artwork placeholder`}>
          <Text style={[styles.initials, {fontSize: Math.max(36, size * 0.25)}]}>{initials}</Text>
          <View style={[styles.glow, {backgroundColor: '#FFFFFF'}]} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {overflow: 'hidden', alignItems: 'center', justifyContent: 'center'},
  image: {width: '100%', height: '100%'},
  fallback: {flex: 1, width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1F2838'},
  initials: {fontWeight: '800', color: '#FFFFFF', letterSpacing: 2},
  glow: {position: 'absolute', width: '60%', height: '18%', borderRadius: 999, opacity: 0.16, bottom: '18%', transform: [{rotate: '-18deg'}]},
});
