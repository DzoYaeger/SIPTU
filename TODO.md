# SIPTU Mobile Self-Service Modules Implementation

Status: ✅ In Progress

## Steps

### 1. ✅ Update mobile/src/constants/modules.js

- Added 6 new modules: bmn, persediaan, it-helpdesk, bmn-maintenance, pdtt, pengusulan
- Assigned colors/icons/routes from theme.js

### 2. ✅ Update mobile/src/constants/theme.js

- Added bmnMaintenance, pdtt, pengusulan colors

### 3. ✅ Update mobile/app/(tabs)/index.jsx & modules.jsx

- Home: Functional search, 5-module stats, responsive, Layanan Mandiri grid
- Modules tab: Added summary text

### 4. ✅ Update mobile/app/modules/[slug].jsx

- Added ACTIONS for all 9 modules
- Extended data load for new modules (bmn-loans, inventory-requests, etc.)

### 5. ✅ Create Core Forms (Phase 1)

- ✅ persediaan/new.jsx (catalog/cart/SPB)
- ✅ bmn/new.jsx (asset/employee/purpose form)
- ✅ it-helpdesk/new.jsx (title/category/priority/desc)

**Current Step: 6 - Phase 2 Forms or Test**

### 4. [ ] Update mobile/app/(tabs)/modules.jsx

- Show all modules grid

### 5. [ ] Update mobile/app/modules/[slug].jsx

- Extend ACTIONS with new modules/actions
- Add data fetches for new modules

### 6. [ ] Create Core Forms (Phase 1)

| Module      | File                                   | API Endpoint                |
| ----------- | -------------------------------------- | --------------------------- |
| Persediaan  | mobile/app/modules/persediaan/new.jsx  | /public/inventory-requests  |
| BMN Loan    | mobile/app/modules/bmn/new.jsx         | /public/bmn-loans           |
| IT Helpdesk | mobile/app/modules/it-helpdesk/new.jsx | /public/it-helpdesk-tickets |

### 7. [ ] Create Remaining Forms (Phase 2)

- ArchiveLoan (kearsipan enhance)
- BmnMaintenance
- PDTT/Pengusulan
- Pencatatan Surat enhance

### 8. [ ] Add Components

- SignatureCanvas (if missing)
- CartList, ItemSelector

### 9. [ ] Test & Demo

- `cd mobile && npx expo start`
- Test submissions via public APIs
- Visual match to web LayananMandiri

**Current Step: 1**
