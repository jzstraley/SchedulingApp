# Fellowship Scheduler - TODO List

## 🔴 Priority Fixes (Must Do)

### App Branding

- [X] Fix app name from "my-app" to "Fellowship Scheduler" in `package.json`
- [X] Update `<title>` in `index.html`
- [X] Add logo/icon to header
- [X] Add footer with copyright, disclaimer, "Created by Straley"

### Mobile Responsiveness

- [ ] Make all tables horizontally scrollable on mobile
- [ ] Touch-friendly buttons and controls
- [ ] Test on various screen sizes
- [ ] Replace drag-and-drop with tap-to-select or dropdowns on mobile

### UI Improvements

- [X] Add PGY dividers on Schedule page (between PGY-4/5/6)
- [X] Add PGY dividers on Stats page
- [X] Sticky headers on all table views
- [X] Highlight function - tap name or rotation to highlight across row/column
- [X] Vacation blocks - muted/gradient/different color styling

- [ ] Move csv exporters to bottom.
- [ ] Need to fix button bar

---

## 🟡 Logic Fixes

### Call/Float Generator

- [X] Constraint: Cannot do call weekend same weekend as night float
- [X] Prioritize even float distribution
- [X] PGY-4 targets prioritized over PGY-5 targets

### Clinic Coverage

- [X] Change from bi-weekly to weekly coverage assignments
- [X] Skip June 2026 for clinic coverage (blocks 25-26)
- [X] Balance to ~2 coverage assignments per fellow
- [X] Different person each week (no back-to-back same coverer)

---

## 🟢 Restore Missing Features

- [ ] Restore Vacation/Request page
- [ ] Vacation input and display functionality

---

## 🔵 Future Features

### Lecture Scheduler (New Module)

- [ ] Lecture calendar with date/time/topic
- [ ] Speaker/presenter assignments
- [ ] Gmail integration for automated reminders
- [ ] RSVP tracking
- [ ] Topic/speaker management database
- [ ] Recurring lecture series support

### Other Ideas
- [ ] Export to Google Calendar / iCal
- [ ] Print-friendly views
- [ ] Dark mode
- [ ] Undo/redo for schedule changes
- [ ] Conflict detection warnings
- [ ] Fellow preferences input (vacation requests, rotation preferences)
- [ ] Analytics dashboard (workload metrics over time)
- [ ] Multi-year schedule planning
- [ ] Backup/restore functionality
- [ ] Share schedule via link

---

## 📝 Notes

### Constraints Summary

- PGY-4s excluded from clinic coverage blocks 1-4
- PGY-6s excluded from clinic coverage blocks 21-26
- Nights rotation = Sun-Fri (6 nights), Sat off
- Call = Sat + Sun
- Float = Sat only
- Cannot have call and night float same weekend

### Targets

| PGY | Call Target | Float Target |
|-----|-------------|--------------|
| 4   | 5           | 5            |
| 5   | 4           | 4            |
| 6   | 2           | 3            |

---

*Last updated: Feb 4, 2026*