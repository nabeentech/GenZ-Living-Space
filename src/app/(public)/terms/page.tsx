import React from "react";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import { ShieldCheck, Building2, Utensils, Phone, Mail, MapPin, UserCheck, Scale, FileText } from "lucide-react";

export const metadata = {
  title: "Terms & Conditions | GenZ Living Space – GenZ Colive PG and Guest Rooms",
  description: "Official Terms and Conditions for GenZ Living Space (GenZ Colive PG and Guest Rooms) in Madhapur, Hyderabad, Telangana. FSSAI Reg: 23626028006147.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col selection:bg-indigo-500/30">
      <Navbar />
      
      <main className="flex-1 py-12 lg:py-20">
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          {/* Header */}
          <header className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <FileText className="w-3.5 h-3.5" />
              <span>Official Legal Agreement</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Terms &amp; Conditions
            </h1>
            <p className="text-base sm:text-lg text-slate-300 font-medium">
              GenZ Living Space – GenZ Colive PG and Guest Rooms
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
              <span className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 font-semibold text-slate-300">
                Last Updated: 12 October 2026
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                FSSAI Reg: 23626028006147
              </span>
            </div>
          </header>

          {/* Legal Summary Banner */}
          <div className="p-6 rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-[#111827] to-[#0B0F19] shadow-xl space-y-4">
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
              Welcome to <strong className="text-white">GenZ Living Space</strong>, operated under the name{" "}
              <strong className="text-white">GenZ Colive PG and Guest Rooms</strong>. These Terms and Conditions
              govern the use of our website, accommodation facilities, guest rooms, food services, amenities, and
              related services.
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              By accessing our website, making a booking, or staying at our property, you agree to comply with the
              following Terms and Conditions. Please read them carefully before making a reservation.
            </p>
          </div>

          {/* Quick Property & Ownership Highlight Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl border border-slate-800 bg-[#101726]/80 text-xs sm:text-sm">
            <div className="space-y-1">
              <span className="text-slate-400 text-xs uppercase font-bold tracking-wider">Business &amp; Property</span>
              <p className="text-white font-semibold">GenZ Colive PG and Guest Rooms</p>
              <p className="text-slate-300 text-xs">Brand: GenZ Living Space</p>
              <p className="text-slate-400 text-xs">Type: Co-living PG Accommodation &amp; Guest Rooms</p>
            </div>
            <div className="space-y-1 sm:border-l sm:border-slate-800 sm:pl-4">
              <span className="text-slate-400 text-xs uppercase font-bold tracking-wider">Management &amp; Food Safety</span>
              <p className="text-white font-semibold">Owner: KANDULA VEERAIAH</p>
              <p className="text-emerald-400 font-medium text-xs flex items-center gap-1">
                <Utensils className="w-3.5 h-3.5" /> FSSAI Registration No: 23626028006147
              </p>
              <p className="text-slate-400 text-xs">Jurisdiction: Telangana, India</p>
            </div>
          </div>

          {/* Complete 22 Terms Sections */}
          <section className="glass-panel p-6 sm:p-10 rounded-3xl border border-slate-800/90 bg-[#101626]/80 space-y-10 text-sm text-slate-300 leading-relaxed shadow-2xl">
            
            {/* Section 1 */}
            <div className="space-y-3 pb-8 border-b border-slate-800/80">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  1
                </span>
                Property Ownership and Management
              </h2>
              <p>GenZ Living Space operates under the name <strong>GenZ Colive PG and Guest Rooms</strong>.</p>
              <ul className="list-disc pl-6 space-y-1.5 text-slate-200">
                <li><strong>Owner Name:</strong> KANDULA VEERAIAH</li>
                <li><strong>Business Name:</strong> GenZ Colive PG and Guest Rooms</li>
                <li><strong>Business Type:</strong> Co-living PG Accommodation and Guest Rooms</li>
                <li><strong>Food Service Registration:</strong> FSSAI Registration Number: 23626028006147</li>
              </ul>
              <p className="text-slate-400">
                The owner and authorized management reserve the right to manage the property, establish reasonable house rules, and make operational decisions in accordance with applicable laws and regulations.
              </p>
            </div>

            {/* Section 2 */}
            <div className="space-y-3 pb-8 border-b border-slate-800/80">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  2
                </span>
                Booking and Reservation
              </h2>
              <ol className="list-decimal pl-6 space-y-2 text-slate-300">
                <li>Reservations may be made through our website, telephone, WhatsApp, or other authorized booking channels.</li>
                <li>All bookings are subject to room and bed availability.</li>
                <li>Guests must provide accurate and complete information during booking, including their name, contact details, identification details where legally required, and intended duration of stay.</li>
                <li>A booking will be considered confirmed only after the management confirms the reservation and any applicable advance payment has been received.</li>
                <li>Room allocation, sharing arrangements, amenities, and services will depend on the selected accommodation plan and availability.</li>
                <li>The management reserves the right to correct booking errors and communicate any necessary changes to the guest.</li>
                <li>Guests must not make false bookings or use another person&apos;s identity to reserve accommodation.</li>
              </ol>
            </div>

            {/* Section 3 */}
            <div className="space-y-3 pb-8 border-b border-slate-800/80">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  3
                </span>
                Check-in and Check-out
              </h2>
              <ol className="list-decimal pl-6 space-y-2 text-slate-300">
                <li>Guests and residents must follow the check-in and check-out timings communicated by the management.</li>
                <li>Valid government-issued identification may be required at check-in, subject to applicable laws.</li>
                <li>Early check-in and late check-out are subject to availability and may attract additional charges.</li>
                <li>Guests must vacate their room or bed at the agreed time unless an extension has been approved by the management.</li>
                <li>Failure to check out on time may result in additional charges as per the applicable property policy.</li>
                <li>The management may refuse check-in where required documentation is missing, a booking cannot be verified, or accommodation cannot lawfully be provided.</li>
              </ol>
            </div>

            {/* Section 4 */}
            <div className="space-y-3 pb-8 border-b border-slate-800/80">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  4
                </span>
                Accommodation Plans and Room Allocation
              </h2>
              <p className="text-slate-400">
                GenZ Living Space may offer single-sharing, double-sharing, triple-sharing, and other room or bed arrangements, depending on availability.
              </p>
              <ol className="list-decimal pl-6 space-y-2 text-slate-300">
                <li>Residents must occupy only the room or bed assigned to them.</li>
                <li>Room or bed changes require prior approval from the management.</li>
                <li>Guests must not sublet, transfer, or share their assigned accommodation with unauthorized persons.</li>
                <li>Room photographs and website descriptions are intended to represent the facilities. Minor variations in room layout, furnishings, or allocation may occur.</li>
                <li>Any request for a particular room, bed, or roommate is subject to availability and cannot be guaranteed unless specifically confirmed in writing.</li>
              </ol>
            </div>

            {/* Section 5 */}
            <div className="space-y-3 pb-8 border-b border-slate-800/80">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  5
                </span>
                Fees, Rent, Deposits and Payments
              </h2>
              <ol className="list-decimal pl-6 space-y-2 text-slate-300">
                <li>Rent, guest-room charges, deposits, food charges, and other applicable fees will be communicated before booking or admission.</li>
                <li>Residents must pay rent and other agreed charges by the due dates specified in their booking agreement or payment schedule.</li>
                <li>Payments may be made through the payment methods authorized by the management.</li>
                <li>Any security deposit, advance payment, or refundable amount will be governed by the applicable booking agreement and communicated refund policy.</li>
                <li>Deductions from refundable deposits may be made for outstanding dues, damage to property, missing items, or other documented and legally permissible charges.</li>
                <li>Late-payment charges, if applicable, must be disclosed to residents in advance.</li>
                <li>Any promotional offers, discounts, or referral benefits are subject to their stated eligibility criteria and validity period.</li>
                <li>The management reserves the right to revise future accommodation rates after providing reasonable notice. Changes will not override an existing confirmed booking or agreement unless permitted under its terms and applicable law.</li>
              </ol>
            </div>

            {/* Section 6 */}
            <div className="space-y-3 pb-8 border-b border-slate-800/80">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  6
                </span>
                Cancellation, Refund and Early Vacating
              </h2>
              <ol className="list-decimal pl-6 space-y-2 text-slate-300">
                <li>Cancellation requests must be submitted through an authorized communication channel.</li>
                <li>Cancellation charges and refund eligibility will depend on the booking type, duration, applicable cancellation policy, and any written agreement.</li>
                <li>Refunds, where approved, will generally be processed through the original payment method or another mutually agreed method.</li>
                <li>Refund processing times may depend on the payment provider or bank.</li>
                <li>Residents intending to vacate before the end of their agreed stay must notify the management in advance and comply with the applicable notice period.</li>
                <li>Advance rent, deposits, or unused accommodation charges will be settled according to the agreed policy and applicable law.</li>
                <li>No refund will be denied where a refund is legally required.</li>
              </ol>
            </div>

            {/* Section 7 */}
            <div className="space-y-4 pb-8 border-b border-slate-800/80">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  7
                </span>
                Food Services and FSSAI Compliance
              </h2>
              <p className="text-slate-300">
                GenZ Colive PG and Guest Rooms may provide food services to residents and guests as part of its accommodation facilities or under a separate meal plan.
              </p>
              
              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-1 text-xs sm:text-sm">
                <p className="font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <Utensils className="w-4 h-4" /> Food Service Registration Details
                </p>
                <p className="text-slate-200"><strong>FSSAI Registration Number:</strong> 23626028006147</p>
                <p className="text-slate-300"><strong>Food Service Provider / Property:</strong> GenZ Colive PG and Guest Rooms</p>
              </div>

              <ol className="list-decimal pl-6 space-y-2 text-slate-300">
                <li>Food services will be provided according to the applicable meal plan, subscription, or accommodation package.</li>
                <li>Menu items, meal timings, and food availability may vary depending on operational requirements and ingredient availability.</li>
                <li>Residents must follow the communicated dining and food-service rules.</li>
                <li>Any food allergies, dietary restrictions, or special dietary requirements should be communicated to the management in advance. Special meals cannot be guaranteed unless confirmed.</li>
                <li>Residents must not waste food or engage in conduct that disrupts food-service operations.</li>
                <li>Food preparation, storage, handling, and service will be subject to applicable food safety requirements.</li>
                <li>The FSSAI registration number is provided for identification and transparency. Its display does not replace any additional licence, registration, or approval required under applicable law.</li>
                <li>Any separately chargeable meals, additional food orders, or changes to a meal plan will be communicated to residents.</li>
                <li>Residents should promptly report food-quality concerns or suspected food-safety issues to the management.</li>
              </ol>
            </div>

            {/* Section 8 */}
            <div className="space-y-3 pb-8 border-b border-slate-800/80">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  8
                </span>
                Amenities and Common Facilities
              </h2>
              <p className="text-slate-400">
                Depending on the selected accommodation package and availability, the property may provide amenities such as a kitchen, gym, home theatre, party room, furnished rooms, and common dining or recreational areas.
              </p>
              <ol className="list-decimal pl-6 space-y-2 text-slate-300">
                <li>Amenities are provided for the intended use of residents and authorized guests.</li>
                <li>Residents must use all facilities responsibly and follow the posted rules and operating hours.</li>
                <li>Some facilities may require advance booking, separate charges, or management approval.</li>
                <li>Access to an amenity may be temporarily restricted for maintenance, safety, repairs, or operational reasons.</li>
                <li>Residents must not damage, misuse, or remove equipment, furniture, appliances, or other property items.</li>
                <li>The management may suspend access to a facility when necessary to protect residents, staff, or property.</li>
              </ol>
            </div>

            {/* Section 9 */}
            <div className="space-y-3 pb-8 border-b border-slate-800/80">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  9
                </span>
                Resident Conduct and House Rules
              </h2>
              <p className="text-slate-400">
                All residents and guests are expected to maintain a safe, respectful, and hygienic living environment. Residents must:
              </p>
              <ol className="list-decimal pl-6 space-y-2 text-slate-300">
                <li>Respect other residents, staff, visitors, and management.</li>
                <li>Maintain cleanliness in rooms, bathrooms, kitchens, and common areas.</li>
                <li>Avoid excessive noise, particularly during designated quiet hours.</li>
                <li>Refrain from unlawful activities, harassment, intimidation, violence, or abusive behaviour.</li>
                <li>Avoid smoking, alcohol consumption, or other restricted activities in areas where prohibited by law or property rules.</li>
                <li>Not possess or use illegal substances or engage in unlawful conduct on the premises.</li>
                <li>Obtain management approval before organizing gatherings or using the party room.</li>
                <li>Follow reasonable safety instructions and emergency procedures.</li>
                <li>Not bring prohibited, hazardous, or dangerous materials onto the premises.</li>
                <li>Comply with visitor policies, security procedures, and applicable property rules.</li>
              </ol>
              <p className="text-amber-400/90 text-xs sm:text-sm font-medium pt-1">
                Serious or repeated violations may result in appropriate action, including termination of accommodation in accordance with the applicable agreement and law.
              </p>
            </div>

            {/* Section 10 */}
            <div className="space-y-3 pb-8 border-b border-slate-800/80">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  10
                </span>
                Visitors and Guest Policy
              </h2>
              <ol className="list-decimal pl-6 space-y-2 text-slate-300">
                <li>Visitors are permitted only in accordance with the property&apos;s visitor policy and applicable legal requirements.</li>
                <li>Visitors may be required to register their details and provide identification where legally required.</li>
                <li>Overnight stays by visitors are not permitted unless explicitly approved and registered as a guest booking.</li>
                <li>Residents are responsible for the conduct of their visitors and any damage caused by them.</li>
                <li>The management may restrict or refuse visitor access where reasonably necessary for security, safety, privacy, or compliance with law.</li>
                <li>Residents must not provide unauthorized persons with keys, access cards, entry codes, or other security credentials.</li>
              </ol>
            </div>

            {/* Section 11 */}
            <div className="space-y-3 pb-8 border-b border-slate-800/80">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  11
                </span>
                Safety, Security and Emergency Procedures
              </h2>
              <ol className="list-decimal pl-6 space-y-2 text-slate-300">
                <li>Residents must follow fire-safety instructions, evacuation procedures, and other emergency guidelines.</li>
                <li>Fire exits, corridors, stairways, and emergency access routes must remain unobstructed.</li>
                <li>Residents must promptly report hazards, suspicious activity, equipment faults, or emergencies to the management or appropriate authorities.</li>
                <li>Tampering with fire alarms, CCTV systems, security equipment, electrical installations, or other safety devices is prohibited.</li>
                <li>CCTV or other security measures may be used in permitted common or access-control areas, subject to applicable privacy laws. Cameras will not be installed in private spaces where prohibited by law.</li>
                <li>Residents should secure their personal belongings and keep their room keys and access credentials safe.</li>
              </ol>
            </div>

            {/* Section 12 */}
            <div className="space-y-3 pb-8 border-b border-slate-800/80">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  12
                </span>
                Personal Belongings and Liability
              </h2>
              <ol className="list-decimal pl-6 space-y-2 text-slate-300">
                <li>Residents are responsible for safeguarding their cash, valuables, documents, electronic devices, and other personal belongings.</li>
                <li>GenZ Living Space will exercise reasonable care in managing its facilities but will not be responsible for loss, theft, or damage to personal belongings except where liability arises under applicable law.</li>
                <li>Residents must promptly report any loss, theft, or damage.</li>
                <li>Nothing in these Terms excludes or limits liability that cannot legally be excluded or limited.</li>
                <li>Residents may be held responsible for loss or damage caused by their negligence, misuse, wilful misconduct, or violation of the applicable accommodation agreement, subject to applicable law.</li>
              </ol>
            </div>

            {/* Section 13 */}
            <div className="space-y-3 pb-8 border-b border-slate-800/80">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  13
                </span>
                Damage to Property
              </h2>
              <ol className="list-decimal pl-6 space-y-2 text-slate-300">
                <li>Residents must maintain the room, furniture, appliances, and facilities assigned to them in reasonable condition.</li>
                <li>Damage beyond ordinary wear and tear must be reported to the management promptly.</li>
                <li>Residents may be charged the reasonable, documented cost of repairing or replacing property damaged through their negligence, misuse, or wilful misconduct.</li>
                <li>Residents must not make structural changes, install fixtures, or modify electrical or plumbing systems without prior written approval.</li>
                <li>Disputes concerning damage assessments or deductions will be handled in accordance with the applicable agreement and law.</li>
              </ol>
            </div>

            {/* Section 14 */}
            <div className="space-y-3 pb-8 border-b border-slate-800/80">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  14
                </span>
                Maintenance and Housekeeping
              </h2>
              <ol className="list-decimal pl-6 space-y-2 text-slate-300">
                <li>Housekeeping, maintenance, and cleaning services will be provided according to the property&apos;s service schedule and the selected accommodation plan.</li>
                <li>Residents must cooperate with reasonable maintenance and housekeeping arrangements.</li>
                <li>The management or authorized staff may enter a room with reasonable prior notice for cleaning, repairs, inspection, or maintenance, subject to the accommodation agreement and applicable law.</li>
                <li>Entry without prior notice may occur where reasonably necessary to address an emergency, immediate safety risk, or other circumstance permitted by law.</li>
                <li>Residents must report maintenance issues, water leaks, electrical faults, and other defects as soon as possible.</li>
              </ol>
            </div>

            {/* Section 15 */}
            <div className="space-y-3 pb-8 border-b border-slate-800/80">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  15
                </span>
                Privacy and Personal Information
              </h2>
              <ol className="list-decimal pl-6 space-y-2 text-slate-300">
                <li>The management may collect personal information necessary for bookings, identification, resident administration, payments, security, communication, and legal compliance.</li>
                <li>Personal information will be handled in accordance with the property&apos;s Privacy Policy and applicable data protection laws.</li>
                <li>Information may be shared with authorized service providers or government authorities where necessary and legally permitted or required.</li>
                <li>Residents should not share other residents&apos; personal information, photographs, or videos without appropriate permission.</li>
                <li>Residents may contact the management to raise questions or concerns regarding their personal information.</li>
              </ol>
            </div>

            {/* Section 16 */}
            <div className="space-y-3 pb-8 border-b border-slate-800/80">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  16
                </span>
                Website Use and Accuracy
              </h2>
              <ol className="list-decimal pl-6 space-y-2 text-slate-300">
                <li>Website content is provided to help visitors understand the accommodation, amenities, pricing, and services offered.</li>
                <li>While reasonable efforts are made to keep information accurate, availability, rates, menus, photographs, and service descriptions may change.</li>
                <li>Website content must not be copied, misused, or reproduced for unlawful purposes.</li>
                <li>Users must not attempt unauthorized access to the website, interfere with its operation, introduce malicious code, or misuse booking or payment features.</li>
                <li>The management may update website content, suspend features, or temporarily restrict website access for maintenance or security reasons.</li>
              </ol>
            </div>

            {/* Section 17 */}
            <div className="space-y-3 pb-8 border-b border-slate-800/80">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  17
                </span>
                Service Interruptions and Unforeseen Circumstances
              </h2>
              <p>
                The management will make reasonable efforts to maintain accommodation and services. Temporary interruptions may occur due to maintenance, utility outages, equipment failures, emergencies, government restrictions, or circumstances beyond reasonable control.
              </p>
              <p className="text-slate-400">
                Where such interruptions materially affect a confirmed stay, the management will communicate relevant information and consider appropriate remedies in accordance with the booking agreement and applicable law.
              </p>
            </div>

            {/* Section 18 */}
            <div className="space-y-3 pb-8 border-b border-slate-800/80">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  18
                </span>
                Suspension or Termination of Accommodation
              </h2>
              <p className="text-slate-300">The management may take appropriate action where a resident:</p>
              <ul className="list-disc pl-6 space-y-1.5 text-slate-300">
                <li>Fails to pay rent or other agreed charges.</li>
                <li>Provides false or misleading booking information.</li>
                <li>Causes serious property damage.</li>
                <li>Engages in unlawful conduct, violence, harassment, or serious misconduct.</li>
                <li>Repeatedly violates reasonable house rules.</li>
                <li>Creates a material safety or security risk.</li>
              </ul>
              <p className="text-slate-400 pt-1">
                Any notice, suspension, termination, eviction, or recovery of outstanding dues will be carried out in accordance with the applicable agreement and law. Residents will not be deprived of rights or remedies available to them under applicable law.
              </p>
            </div>

            {/* Section 19 */}
            <div className="space-y-3 pb-8 border-b border-slate-800/80">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  19
                </span>
                Third-Party Services and Payment Providers
              </h2>
              <p>
                The website may use third-party services for payment processing, communication, maps, or other functions. Such services may be governed by their own terms and privacy policies.
              </p>
              <p className="text-slate-400">
                GenZ Living Space is not responsible for independent third-party services beyond the responsibilities imposed on it by applicable law. Residents should review the relevant third-party terms before using those services.
              </p>
            </div>

            {/* Section 20 */}
            <div className="space-y-3 pb-8 border-b border-slate-800/80">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  20
                </span>
                Changes to These Terms
              </h2>
              <p>
                The management may revise these Terms and Conditions from time to time to reflect changes in services, property rules, business operations, or legal requirements.
              </p>
              <p className="text-slate-400">
                The updated version will be published on the website with a revised &ldquo;Last Updated&rdquo; date. Material changes affecting existing residents or confirmed bookings will be communicated where appropriate. Changes will be applied subject to the applicable agreement and law.
              </p>
            </div>

            {/* Section 21 */}
            <div className="space-y-3 pb-8 border-b border-slate-800/80">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  21
                </span>
                Governing Law and Dispute Resolution
              </h2>
              <p>
                These Terms and Conditions will be governed by the laws of India and the applicable laws of Telangana.
              </p>
              <p>
                Any concern or dispute should initially be raised with the property management so that the parties may attempt to resolve it amicably. Where a dispute cannot be resolved informally, it may be referred to the competent courts or authorities having jurisdiction under applicable law.
              </p>
              <p className="text-slate-400">
                Nothing in this clause limits any consumer rights or other statutory remedies available under applicable law.
              </p>
            </div>

            {/* Section 22 */}
            <div className="space-y-6">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-black border border-indigo-500/30">
                  22
                </span>
                Contact Information
              </h2>
              <p>
                For bookings, payments, accommodation enquiries, food-service concerns, or questions regarding these Terms and Conditions, please contact the management using the official contact details published on the GenZ Living Space website.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl border border-indigo-500/30 bg-[#161F36]/60">
                <div className="space-y-2">
                  <div className="flex items-start gap-2.5">
                    <Building2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Business &amp; Property</p>
                      <p className="text-white font-semibold">GenZ Colive PG and Guest Rooms</p>
                      <p className="text-xs text-indigo-300">Brand: GenZ Living Space</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 pt-2">
                    <UserCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Owner</p>
                      <p className="text-white font-semibold">KANDULA VEERAIAH</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2.5">
                    <Utensils className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">FSSAI Registration</p>
                      <p className="text-emerald-400 font-semibold font-mono text-xs">23626028006147</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 pt-2">
                    <Phone className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Phone / WhatsApp</p>
                      <a href="tel:+919652037700" className="text-white font-semibold hover:text-indigo-300 transition-colors">
                        +91 96520 37700
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 pt-1">
                    <Mail className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Email</p>
                      <a href="mailto:genzlivingspace@gmail.com" className="text-white font-semibold hover:text-indigo-300 transition-colors">
                        genzlivingspace@gmail.com
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-700/60 bg-slate-900/60 text-xs text-slate-400">
                <strong className="text-slate-200">Acknowledgement:</strong> By booking or using our accommodation and related services, you acknowledge that you have read and understood these Terms and Conditions and agree to comply with the applicable property policies.
              </div>
            </div>

          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
}
