# Fincan Privacy Policy

**Service provider:** Hibrit  
**Application:** Fincan  
**Website:** https://fincan.hibrit.dev  
**Last updated:** 17 October 2026  
**Contact address for privacy and personal data requests:** ____________________

## 1. Scope and data processing roles

This Policy explains how Fincan collects, uses, stores, and shares data relating to business account holders, authorized users, and QR menu visitors. Fincan is a QR menu and business management application provided by Hibrit.

Hibrit acts as a data controller for processing whose purposes and means it determines, including the creation of Fincan accounts, session security, application operations, and management of its own service. The relevant business may also have data controller responsibilities when managing customer orders and publishing its own menu and business content. Hibrit's role as a data processor for activities carried out on a business's instructions depends on the service relationship and the actual processing. The business's own disclosures also apply to order preparation, payment, receipts/invoices, and information it collects outside Fincan.

This Policy does not cover the independent processing activities of Google, social networks, WhatsApp, or business websites opened through third-party links.

## 2. Information processed for business accounts

### 2.1. Google sign-in

If you choose to continue with Google, authentication is handled through Google and Supabase Auth. Basic authentication may provide your Google account identifier, email address and verification status, name/profile name, and profile information supplied by Google. Your profile picture URL may also appear in Supabase Auth records or session data as part of Google's identity information.

Fincan uses your email address and user identifier to associate you with your account and control access, and your name/profile name to identify and display you in the management interface. The current interface does not display your Google profile picture as your user avatar. Identity provider information, account creation and last sign-in timestamps, and session information are managed by Supabase Auth.

Your Google password is not provided to Fincan. Fincan's current Google sign-in feature does not request access to or read your Gmail messages, Google Drive files, contacts, or calendar. Google data is used for authentication, account management, security, and features provided to the relevant user; it is not used for advertising targeting, data sales, or training artificial intelligence models.

Fincan's use and transfer of information received from Google are carried out in accordance with the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements to the extent applicable.

### 2.2. Email, passwords, and sign-in links

When you create an account using an email address and password, your email address and authentication information are sent to Supabase Auth. Supabase Auth manages password authentication; your password is not stored in Fincan's business or order tables. When you request an email sign-in link, your email address is processed to send the link and verify the account. Email verification, sign-in, and security messages form part of these operations; the current application does not offer a marketing email subscription.

### 2.3. Business information, menus, and uploaded content

Processed information includes the user identifier associated with the account, business name, menu URL, location description, table count, publication status, business coordinates, social media and website links, optional WhatsApp contact number, Google reviews link, logo, product photos, product names, descriptions, prices, categories, labels, availability, and design preferences. Record creation and update timestamps are also stored.

Logos and product photos are processed in the browser for size and format before being uploaded to Supabase Storage. In the current application, importing a menu from text is performed by parsing the text in the browser; the resulting product data is sent to the server when saved. Menu text is not sent to an external artificial intelligence or OCR service for this feature.

## 3. Information processed for menu visitors

### 3.1. Visit counting

When you open a published menu, a random identifier is created for your browser and saved in local storage under `fincan-visitor`. The business identifier, visitor identifier, and table number, if available, are sent to the server. The visit record contains the business, day, hour, and table number, if available. One visit record is created per identifier, per business, per day.

This identifier can be used across different menus on the same site and on different days. Although your name or email address is not directly requested, these records are not considered fully anonymous because the identifier can link repeat visits. Visits are presented as aggregate statistics in the business management interface; raw visit records containing the identifier exist in the underlying infrastructure.

### 3.2. Table orders

When you submit an order, the business and table information, selected products and quantities, QR order verification information, a daily code if required, and visitor identifier are processed. The order record stores the order identifier, business, table number, product identifiers and names, quantities, unit prices, total amount, status, and creation/update timestamps. Where applicable, the approximate distance and whether it was calculated using device location or IP information are also stored.

The visitor identifier is not added to the current order table; it is used for visit counting and request rate limiting. Visitors are not asked for their name, email address, phone number, delivery address, or card details to place an order. If a business separately requests information through its WhatsApp link or another channel, this forms part of the processing activities of that channel and the relevant business.

### 3.3. Location and approximate distance

When you open the order cart, your browser may request permission to access your device location. If you grant permission, your latitude and longitude are sent to the server when the relevant order is submitted, and your distance from the business is calculated. You can use the current ordering feature without granting permission. Browser location permission does not replace separate legally required explicit consent to personal data processing where such consent is necessary.

If device location is not provided and the infrastructure supplies it, Cloudflare's approximate IP-based location information may be used to calculate distance. Distance is not calculated if business coordinates have not been configured. The order database stores the distance rounded to a whole kilometre and the `gps` or `ip` source, rather than the visitor's latitude and longitude. This statement does not mean that network and infrastructure providers process no location or IP information in their own technical records.

In contrast, **business coordinates entered by the business user are stored**, including coordinates captured using the “Bu konumdayım” (“I am at this location”) option. Because business data may be passed to the published menu, do not enter business coordinates that you consider confidential. Distance information is provided to the business; the current code does not automatically reject orders based on this distance.

## 4. Technical data, browser storage, and cookies

When you access Fincan, Google, Supabase, or Cloudflare may process your IP address, request time, requested URL, and connection/browser information to establish the connection, provide the service, and maintain security. Technical records relating to authentication and server errors may be generated. Fincan's own visit and order tables do not contain fields for raw IP addresses or browser user-agent information.

| Data in the browser | Purpose | Duration and controls |
| --- | --- | --- |
| Supabase session cookie | Maintaining sessions, access and refresh tokens, and completing sign-in; provider session data may also be present. It is written only after you sign in; no such cookie is created for a menu visitor who is not signed in | A first-party cookie (`sameSite=lax`, path `/`); valid for approximately 400 days. It may be removed by signing out or clearing site data; sessions on all devices may not end simultaneously. |
| `fincan-visitor` (local storage) | Counting repeat menu visits and limiting order requests | The application does not assign an automatic expiry date; the identifier may remain until site data is cleared or the browser removes it. |
| `fincan-theme`, `fincan-menu-theme` (local storage) | Remembering light/dark appearance preferences | The application does not assign an automatic expiry date; preferences can be changed or site data cleared. |
| Cart and selected table | Preparing an order in the open menu | Held in the page's working memory in the current application; no persistent cart record is created. |

The session cookie is **strictly necessary** for the service to function (without it you cannot sign in and the management screens cannot open), so it falls under the strictly-necessary exemption in the rules on storing information in the browser; no separate cookie consent is requested, and the cookie is created only by the sign-in you initiate. The visitor identifier and theme preferences are kept in local storage; local storage is not the same mechanism as cookies and, unlike cookies, is not sent to the server with every request. Google may use its own session mechanisms during Google sign-in. The current Fincan application code does not include advertising cookies, Google Analytics, advertising pixels, or third-party behavioural tracking integrations. Menu visits are measured using the application's own statistics system described above.

You can clear site data through your browser settings. This may remove your session and preferences and cause a new visitor identifier to be created on your next visit; it does not automatically delete records previously created on the server. The current interface does not provide a separate preference switch to disable visit counting.

## 5. Purposes and legal bases

Your data is processed to create and authenticate accounts, provide business and menu services, forward orders to businesses, provide statistics, reduce misuse, provide technical support, and comply with legal obligations. Data is collected electronically through your forms and uploads, Google authentication, the browser session cookie and local storage, application API requests, and infrastructure providers.

The references below are to Türkiye's Personal Data Protection Law No. 6698, referred to as “KVKK.”

| Processing activity | Applicable legal basis |
| --- | --- |
| Accounts, sessions, business management, and providing the service requested by the user | Processing necessary for entering into or performing a contract; KVKK Article 5/2(c). The strictly-necessary session cookie falls within this basis and does not require separate cookie consent. |
| Forwarding orders and the business's management of orders | Processing necessary for entering into or performing the relevant contract; the parties' data processing roles are also taken into account. |
| Security, authorization checks, and prevention of misuse | Legitimate interests, provided that fundamental rights and freedoms are not adversely affected; KVKK Article 5/2(f). |
| Visit statistics | Legitimate interest conditions and rules concerning storage of information in the browser must be assessed separately; prior explicit consent is obtained where required. |
| Optional distance calculation using precise device location | Separate explicit consent where applicable; KVKK Article 5/1. For IP-based distance signals, the security purpose and legitimate interest conditions are assessed separately. |
| Legal requests and disputes | Compliance with a legal obligation and/or establishing, exercising, or protecting a right; KVKK Articles 5/2(ç) and 5/2(e). |

You may choose not to share unnecessary data, leave optional information blank, or deny device location permission. Where processing requires explicit consent, acceptance of this Policy or the Terms of Service alone does not mean that such consent has been obtained. Processing that requires explicit consent must be accompanied by a separate and appropriate notice and consent process.

## 6. Who receives the data?

- **Supabase:** Used for account and session management, the database, business/menu/visit/order records, and image storage.
- **Cloudflare:** Used to run the web application, serve content, maintain network security, limit requests, and provide approximate IP-based location information where available. The visitor identifier may be sent to the request rate limiting service.
- **Google:** Handles Google sign-in. Google's own terms and privacy disclosures apply to its services.
- **The relevant business:** Can view order content, table, amount, time, status, and approximate distance, if available. Visit statistics are displayed in the business account. Access to the business's visit records in the underlying infrastructure is also possible within the scope of ownership permissions.
- **Authorized Hibrit administrators:** May access user identifiers, email addresses, account creation and last sign-in timestamps, associated businesses, menu information, and statistics for service management, support, and security. The time of a support edit and the identifier of the administrator making it may be stored in the business record.
- **Public menu users:** Can view published menu/business content, optional links, and public images. Your account email address is not published in the menu merely because you signed in with Google.
- **Competent authorities:** Data may be shared to the extent necessary to comply with valid legal obligations and requests.

Frankfurter/ECB exchange rate data is fetched by the server for currency conversion. The current request does not send account, visitor, or order data to the exchange rate provider. When you follow an external website, social media, WhatsApp, or Google reviews link, the relevant service may process its own data. If you view an image that the business hosts on an external server, your browser may send a request to that server.

Within Fincan, we do not sell personal data or transfer it to third parties for advertising targeting.

## 7. Public content and image storage

Logos and product images are served from Supabase's public `menu-images` storage bucket. Anyone with a file URL may access the image; URLs may also contain the uploading user's technical identifier. Unpublishing a menu does not automatically delete separate image files. Upload only images that you have the right to publish.

The business's location description, optional contact links, and other information entered into the menu may be public. Copies created by third parties through screenshots, downloads, caching, or other means are outside Fincan's direct control.

## 8. Storage environments and international processing

Fincan uses Supabase and Cloudflare infrastructure and Google authentication. These services' servers and subprocessors may be located outside Türkiye; providing the service may involve personal data being processed abroad or accessible from abroad.

Database location, backups, technical logs, and provider access depend on the providers' project, plan, and account settings. Selecting a database in one region does not mean that all provider data is processed exclusively in the same country.

Transfers abroad require assessment of an appropriate transfer condition and safeguards under KVKK Article 9 and other applicable rules. Signing in with Google, reading this Policy, or accepting the Terms of Service does not, on its own, constitute general consent to international transfers. The existence of providers' standard service agreements does not mean that KVKK transfer requirements have automatically been fulfilled.

## 9. Retention and deletion

Data should be retained only for as long as necessary for the purposes for which it was collected and applicable legal obligations. Account information and business content are assessed in relation to the continuation of the service relationship; visit and order records in relation to statistics, business management, and protection of relevant rights; and technical security records in relation to security and investigating issues.

The current application code does not include a process that automatically deletes account, visit, order, or request rate limiting records after a specified number of days. Displaying the last 30 days of data in the statistics screen does not mean that older visit records have been deleted. Records may remain in the database unless separately deleted following a request or as part of operational procedures; this technical situation does not provide a legal basis for unlimited retention.

The application does not assign an automatic expiry date to the browser's visitor identifier or theme preferences. Session token validity periods depend on Supabase settings. Retention periods for infrastructure logs and any backups depend on the relevant provider's settings and service plan.

If an account is actually deleted, related business, visit, and order records may be deleted through cascading database relationships. Files in image storage and request rate limiting records containing visitor identifiers require separate cleanup. Unpublishing a menu, removing Google access, or clearing browser data does not delete all records on the server.

For deletion requests, account ownership and relevant records are verified; deletion, destruction, or anonymization may be applied to data whose processing conditions no longer exist. If a record must be retained due to a legal obligation, the request and retention reason are assessed separately. The timing and scope of deletion from backups depend on their technical lifecycle; immediate deletion from every backup is not guaranteed.

## 10. Data security

Fincan uses Supabase authentication, API token verification, business ownership checks, and database row-level access policies. Administrator access is subject to authorization checks. Image upload permissions are restricted by user folders; serving images publicly is an intentional feature of the service.

No internet service can provide absolute security. Protect your device, email/Google account, and session credentials. You can contact Hibrit through its contact channel if you suspect a security breach. Hibrit's security and breach notification obligations under applicable law remain unaffected.

## 11. Your rights and requests

Under KVKK Article 11, you have the right to learn whether your personal data is processed; request information if it has been processed; learn the purpose of processing and whether it is used for that purpose; know the third parties to whom it is transferred domestically or abroad; request correction of incomplete or inaccurate data; request deletion or destruction where the legal conditions are met; request that recipients be notified of correction and deletion actions; object to an adverse result arising exclusively from automated analysis; and seek compensation for damage caused by unlawful processing.

You can send privacy, access, or account closure requests to the Hibrit contact address on this page. For account matters, please write from your registered email address where possible. For visit or order requests, the relevant menu URL, date, and order number, if available, help locate records. The visitor identifier stored in the browser may also be needed to match relevant records. Do not send your password or access token.

Formal KVKK requests may be submitted in writing or through permitted electronic methods in accordance with the applicable request procedure. Appropriate and proportionate identity verification may be required depending on the request. Properly submitted requests are handled as soon as possible and within 30 days at the latest; reasons are provided if a request is refused. The right to complain to the Turkish Personal Data Protection Board and other legal remedies remain available as provided by law.

The current application does not have an automatic account deletion button in the user dashboard. You can remove the Fincan connection from your Google account's third-party connections section; this does not delete past Fincan records. Contact Hibrit separately to request deletion of records. You may also need to contact the relevant business regarding its own customer records or processing outside Fincan.

## 12. Children and optional information

Fincan business management accounts are intended for adult, authorized business users. No account creation or Google sign-in is required to view a menu. The application does not include age or date-of-birth fields; do not add children's identity information, photos, or other unnecessary personal data to menu content. You can notify Hibrit if you believe data relating to children is being processed inappropriately.

## 13. Policy changes and contact

Changes to this Policy are published with the last updated date. Appropriate notice will be provided if there is a material change to processing purposes, the use of Google data, or data sharing; any required consent or other legal conditions for the new processing will be addressed separately.

**Data controller / service provider:** Hibrit  
**Website:** https://fincan.hibrit.dev  
**Contact address for privacy, KVKK requests, and account deletion:** ____________________
