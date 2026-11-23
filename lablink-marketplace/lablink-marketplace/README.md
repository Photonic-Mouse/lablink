# LabLink Marketplace

A responsive, interactive front-end prototype inspired by the visual structure and shopping experience of Mayhem Wheels, reimagined for a campus laboratory equipment marketplace.

## Run locally

This is a static site. Open `index.html` in a browser, or run a local server from this folder:

```bash
python -m http.server 5500
```

Then visit http://localhost:5500.

## Included interactions
- Equipment catalogue with department filters and sorting
- Search overlay and live search
- Save equipment to My Kit (stored in localStorage)
- Equipment detail modal with technical specifications
- Project-based access request form (saved locally in localStorage)
- Responsive mobile navigation and layouts

## Notes
This is a frontend prototype. Booking requests are stored in the current browser only; connect the form to your LabLink API and faculty approval workflow for production. Product photography is loaded from Unsplash and requires an internet connection.
