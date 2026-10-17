/* ==========================================================================
   PepperScan — editable site content
   --------------------------------------------------------------------------
   This is the ONLY file you need to edit to put real information on the site.

   • Anything in [BRACKETS] is a placeholder. It shows on the page as a dashed
     orange highlight so you can spot it. Replace it with the real value.
   • Empty links ("") show as dashed placeholders until you add a URL.
   • Charts and the numbers on the Home page are computed from the data in
     `results`. Set results.placeholder to false when you enter REAL data.
   ========================================================================== */

window.SITE = {

  /* ---- Contact ---------------------------------------------------------- */
  email: "[YOUR TEAM EMAIL]",
  // Optional: paste a Formspree (or similar) endpoint URL to make the contact
  // form submit directly. Leave empty to open the visitor's email app instead.
  formEndpoint: "",

  /* ---- Links (full https:// URLs) -------------------------------------- */
  links: {
    github: "",   // e.g. "https://github.com/your-team/pepperscan"
    paper: "",    // e.g. "https://.../pepperscan-paper.pdf" or "assets/paper.pdf"
    video: ""     // YouTube link, or a file such as "assets/demo.mp4"
  },

  /* ---- Institution ------------------------------------------------------ */
  institution: {
    university: "[UNIVERSITY NAME]",
    department: "[DEPARTMENT]",
    course: "[COURSE NAME]",
    supervisor: "[SUPERVISOR NAME]"
  },

  /* ---- Team (order is the order shown). role: data | ml | hw | backend | lead
         photo: path such as "assets/team/seyha.jpg", or "" for no photo ----- */
  team: [
    { role: "data",    name: "[NAME]", photo: "" },
    { role: "ml",      name: "[NAME]", photo: "" },
    { role: "hw",      name: "[NAME]", photo: "" },
    { role: "backend", name: "[NAME]", photo: "" },
    { role: "lead",    name: "[NAME]", photo: "" }
  ],

  /* ---- Gallery (project page). src: image path, e.g. "assets/gallery/pi.jpg"
         cap: caption key from i18n.js (gallery.cap1 … gallery.cap6), or edit
         the caption text there. Leave src "" to show a placeholder tile. ---- */
  gallery: [
    { src: "", cap: "gallery.cap1" },
    { src: "", cap: "gallery.cap2" },
    { src: "", cap: "gallery.cap3" },
    { src: "", cap: "gallery.cap4" },
    { src: "", cap: "gallery.cap5" },
    { src: "", cap: "gallery.cap6" }
  ],

  /* ---- Results ----------------------------------------------------------- */
  results: {
    // true  = charts show the demo numbers below with a PLACEHOLDER watermark,
    //         and Home/Results facts show placeholders.
    // false = everything below is treated as your real, measured data.
    placeholder: true,

    summary: {
      datasetImages: null,     // e.g. 1200  (total images collected)
      epochs: null,            // e.g. 100
      piModel: "",             // e.g. "5" or "4"  (shown as "Raspberry Pi 5")
      threshold: 0.6,          // alert confidence threshold used in pi_watch.py
      pilotStatus: "[PILOT STATUS]"   // e.g. "completed on 2 farms over 6 weeks"
    },

    // Class names exactly as trained (folder names). Order = confusion matrix order.
    classNames: ["Healthy", "Disease A", "Disease B"],

    // Confusion matrix on the validation set. Rows = TRUE class, columns =
    // PREDICTED class, same order as classNames. Accuracy, precision, recall
    // and F1 on the site are all computed from this matrix.
    confusion: [
      [48, 1, 1],
      [2, 44, 4],
      [1, 5, 44]
    ],

    // Accuracy (0–1) at the end of each epoch, from runs/.../results.csv
    training: {
      train: [0.52, 0.63, 0.70, 0.76, 0.80, 0.83, 0.86, 0.88, 0.89, 0.91, 0.92, 0.93, 0.935, 0.94, 0.945],
      val:   [0.50, 0.60, 0.66, 0.72, 0.76, 0.79, 0.82, 0.84, 0.85, 0.86, 0.87, 0.875, 0.88, 0.885, 0.885]
    },

    // Inference time per image on the Raspberry Pi, in milliseconds.
    // deployedIndex = which entry is the model you actually deployed
    // (its time is shown on the Home page).
    inference: [
      { label: "YOLOv11n-cls · 224", ms: 120 },
      { label: "YOLOv11n-cls · 320", ms: 210 },
      { label: "YOLOv11s-cls · 224", ms: 320 }
    ],
    deployedIndex: 0
  }
};
