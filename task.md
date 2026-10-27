# ResuMatch Firebase Migration — Task Tracker

## Phase 1: Firebase Project Setup & Configuration
- [x] Install Firebase SDK dependencies (client)
- [x] Install Firebase Admin SDK dependencies (server)
- [x] Create `client/src/config/firebase.js`
- [ ] Create `firebase.json` project config (Phase 7/8)
- [ ] Create `firestore.rules` (Phase 8)
- [ ] Create `storage.rules` (Phase 8)
- [ ] Create `.firebaserc` (Phase 7/8)

## Phase 2: Auth Migration (Remove Staff, Add Applicant)
- [x] Rewrite `AuthContext.jsx` for Firebase Auth
- [x] Rewrite `Login.jsx` for Firebase Auth
- [x] Create `Register.jsx` (applicant self-registration)
- [x] Update `api.js` to use Firebase ID tokens
- [x] Create Firestore-based user profile service

## Phase 3: Firestore Data Layer
- [x] Create `client/src/services/firestore.js`
- [ ] Adapt server controllers to use Firebase Admin + Firestore (Phase 7)
- [ ] Migrate helpers.js (Phase 7)

## Phase 4: Firebase Storage for Resumes
- [x] Create `client/src/services/storage.js`
- [x] Update resume upload flow for Firebase Storage
- [ ] Server-side resume processing via Firebase Admin Storage (Phase 7)

## Phase 5: Public Job Portal
- [x] Create `PublicLayout.jsx`
- [x] Create `ApplicantLayout.jsx`
- [x] Create `HomePage.jsx`
- [x] Create `JobSearch.jsx`
- [x] Create `PublicJobDetail.jsx`
- [x] Create `ApplicantDashboard.jsx`
- [x] Create `MyApplications.jsx`
- [x] Create `ApplicantProfile.jsx`
- [x] Create `ResumeUpload.jsx` (applicant)
- [x] Create `ResumeBuilder.jsx`
- [x] Create `ApplicationSubmit.jsx`
- [x] Create `CookieConsent.jsx`
- [x] Create `PrivacyPolicy.jsx`
- [x] Create `CookiePolicy.jsx`
- [x] Create `TermsOfUse.jsx`

## Phase 6: Adapt Admin Dashboard
- [ ] Update `Dashboard.jsx` to Firestore
- [ ] Update `Applicants.jsx` to Firestore
- [ ] Update `ApplicantView.jsx` to Firestore
- [ ] Update `Jobs.jsx` to Firestore
- [ ] Update `JobCreate.jsx` to Firestore
- [ ] Update `JobDetail.jsx` to Firestore
- [ ] Update `ResumeUploadPage.jsx` to Firestore + Storage
- [ ] Update `Users.jsx` to Firestore (remove staff role)
- [ ] Update `Reports.jsx` to Firestore
- [ ] Update `ActivityLogs.jsx` to Firestore
- [ ] Update `DashboardLayout.jsx` notifications to Firestore

## Phase 7: Server-Side Firebase Admin (AI + Backend)
- [x] Create `server/config/firebaseAdmin.js`
- [ ] Adapt `server/services/aiEngine.js` for Firestore
- [ ] Adapt `server/controllers/resumeController.js` for Firebase
- [ ] Adapt all server routes for Firebase Auth verification
- [ ] Adapt server controllers for Firestore

## Phase 8: App Check, Security & Polish
- [ ] Create App Check config with reCAPTCHA v3
- [ ] Finalize Firestore security rules
- [ ] Finalize Storage security rules
- [x] Update `App.jsx` routing (public + applicant + admin)
- [ ] Responsive testing
- [ ] Cookie consent integration
