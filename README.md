# Trattoria Lume — booking prototype (Italian restaurant)

Front-end-only prototype of a 24/7 table-booking site for a fictional Florentine trattoria.
All copy is in Italian. No backend: availability, payments, SMS, and calendar sync are simulated in the browser.

## Run it
Static files, no build step. Serve the folder with any static server:

```
python3 -m http.server 8000   # then open http://localhost:8000
```

(Opening `index.html` directly from disk also works in most browsers.)

## What it demonstrates
- **Booking flow ("comanda")**: covers → calendar (Mondays closed, availability dots) → lunch/dinner slots (sold-out / "ultimi 2") → interactive floor plan for 4 rooms with real table capacities → menu experience (à la carte / tasting / chef's counter) → customer details with validation → summary.
- **Deposit via SMS**: a phone mockup receives the SMS, the link opens a payment sheet (card, Satispay, Google Pay, Apple Pay), and payment prints a receipt with a barcode.
- **Google Calendar**: "Apri in Google Calendar" is a real pre-filled event link (Europe/Rome timezone).
- **Automatic reminders**: the reminder timeline (24 h, 3 h, next-day review), plus a simulated next-day reminder where the customer replies 1 or 2 to confirm or cancel.
- **Owner dashboard ("Dietro le quinte")**: tonight's covers, deposits taken, no-show stats, bookings list with status chips, and a table timeline. Bookings made in the demo appear here live. Data is kept in `localStorage`.

## Structure
```
index.html
assets/css/style.css        design tokens + all styles
assets/js/dati.js           tables, rooms, seeded availability, sample bookings, storage, events
assets/js/effetti.js        motion: loader, candlelight hero, marquee, pinned rotating plates, wine-fill title
assets/js/prenota.js        booking app + phone simulation
assets/js/cruscotto.js      owner dashboard
assets/vendor/              GSAP 3.15 + ScrollTrigger, Lenis 1.3 (self-hosted)
assets/fonts/               Bodoni Moda, Hanken Grotesk, Caveat (self-hosted, GDPR-friendly)
assets/img/                 WebP photos
```

## Hooking up a backend later
Swap these functions in `assets/js/dati.js` for API calls: `occupato` / `tavoliLiberi` (availability), `salvaPrenotazione` / `aggiornaPrenotazione` (bookings), `esempiGiorno` (dashboard data). In `prenota.js`, `invia()` is where the SMS + payment-link request goes (e.g. Twilio + Stripe Payment Links), and the `#pagaBtn` handler becomes the payment webhook result.

## Credits
Photos: CC0 (pxhere, foodiesfeed, rawpixel, Pexels), taken from Automattic's GPL WordPress themes repo. Fonts: SIL OFL. GSAP: standard no-charge license. Lenis: MIT.
