import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.marcoapetz.vozpdf',
  appName: 'VozPDF',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
};

export default config;
