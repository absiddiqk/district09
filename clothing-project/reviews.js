/*
  CUSTOMER REVIEW PHOTOS  (the slideshow on the home page)
  --------------------------------------------------------
  HOW TO ADD YOUR OWN PHOTOS
  1. Put your review photos in the "reviews" folder (for example reviews/review1.jpg).
     Portrait photos (taller than wide) look best.
  2. Add one line per photo to D09_REVIEW_IMAGES below, like:
        { src: "reviews/review1.jpg", alt: "Customer wearing the Classic Henley in black" },
  3. Delete the sample lines (the ones that point at product photos).
  4. Change D09_REVIEWS_ARE_PLACEHOLDERS to false. This removes the
     "coming soon" label and the sample-photos note.
  The slideshow changes photo by itself and goes back to the first photo after the last one.
*/

// true  = show the "coming soon / sample photos" label
// false = hide it (do this once your real review photos are in)
window.D09_REVIEWS_ARE_PLACEHOLDERS = true;

// How long each photo stays on screen, in milliseconds (3500 = 3.5 seconds).
window.D09_REVIEW_INTERVAL_MS = 3500;

window.D09_REVIEW_IMAGES = [
  // Sample photos (existing product pictures). Replace these with your review photos.
  { src: "plain_black.jpg",        alt: "Sample photo: Classic Henley in black" },
  { src: "short_sleeve_white.jpg", alt: "Sample photo: Short sleeve Henley in white" },
  { src: "special_henley2.jpg",    alt: "Sample photo: Signature Henley in navy blue" },
  { src: "plain_brown.jpg",        alt: "Sample photo: Classic Henley in brown" },
  { src: "short_sleeve_skyblue.jpg", alt: "Sample photo: Short sleeve Henley in sky blue" }
];
