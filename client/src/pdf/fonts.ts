import { Font } from "@react-pdf/renderer";

// Static TTFs — react-pdf can't parse variable fonts or woff2, and each
// weight needs its own file or bold text silently renders regular.
Font.register({
  family: "Inter",
  fonts: [
    { src: "/fonts/Inter-Regular.ttf" },
    { src: "/fonts/Inter-Medium.ttf", fontWeight: 500 },
    { src: "/fonts/Inter-Bold.ttf", fontWeight: 700 },
  ],
});

// react-pdf ships English hyphenation, which mangles long German compounds
// ("Krankenversicher-ung") — disable it and let flexbox wrap whole words.
Font.registerHyphenationCallback((word) => [word]);
