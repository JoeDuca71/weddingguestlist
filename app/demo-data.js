// Made-up sample guests for demo mode (?demo). Never touches the real data.
window.DEMO_DATA = [
  { family_name: "Sue & Chris Tracey", affiliation: "Dylan Family", invite_status: "Done", live_in_town: "Yes", hotel_status: "n/a", hotel_swag: "n/a", transportation: "Self", city: "Carmel", state: "IN",
    people: [
      { first_name: "Sue", last_name: "Tracey", role: "Wedding Party", rsvp: "Yes", rd_invited: 1, rd_status: "Yes", afterparty: "Yes", table_status: "Seated", table_number: "1" },
      { first_name: "Chris", last_name: "Tracey", role: "Wedding Party", rsvp: "Yes", rd_invited: 1, rd_status: "Yes", afterparty: "No", table_status: "Seated", table_number: "1" },
    ] },
  { family_name: "The Brad Johnson Family", affiliation: "Joe Friends", live_in_town: "No", hotel_status: "Yes Host Hotel", city: "Chicago", state: "IL", invite_status: "Texted for RSVP",
    people: [
      { first_name: "Brad", last_name: "Johnson", rsvp: "Yes", afterparty: "Yes", afterparty_swag: "Yes" },
      { first_name: "Kim", last_name: "Johnson", rsvp: "Yes", afterparty: "Yes" },
      { first_name: "Ava", last_name: "Johnson", rsvp: "TBD" },
    ] },
  { family_name: "Marco & Lena Ruiz", affiliation: "Mutual", live_in_town: "No", hotel_status: "Maybe Host Hotel", city: "Nashville", state: "TN", invite_status: "Postcard Sent",
    people: [{ first_name: "Marco", last_name: "Ruiz", rsvp: "Maybe" }, { first_name: "Lena", last_name: "Ruiz", rsvp: "Maybe" }] },
  { family_name: "Grandma Rose Duca", affiliation: "Joe Family", live_in_town: "No", hotel_status: "Yes Tracey BnB", transportation: "Tracey BnB Shuttle", city: "Pittsburgh", state: "PA", gift: "Quilt",
    people: [{ first_name: "Rose", last_name: "Duca", rsvp: "Yes", rd_invited: 1, rd_status: "Yes", table_status: "Seated", table_number: "2" }] },
  { family_name: "Priya Shah & Guest", affiliation: "Dylan Friends", live_in_town: "Yes", hotel_status: "n/a", hotel_swag: "n/a", transportation: "Self", city: "Indianapolis", state: "IN",
    people: [{ first_name: "Priya", last_name: "Shah", rsvp: "No" }, { first_name: "Guest of", last_name: "Priya Shah", rsvp: "No" }] },
  { family_name: "DJ Nova", affiliation: "Mutual", invite_status: "Done", live_in_town: "Yes", hotel_status: "n/a", hotel_swag: "n/a", transportation: "Self", city: "Indianapolis", state: "IN",
    people: [{ first_name: "Sam", last_name: "Nova", role: "DJ", rsvp: "Yes", table_status: "n/a" }] },
  { family_name: "The Okafor Family", affiliation: "Joe Friends", live_in_town: "No", city: "Columbus", state: "OH", invite_status: "Texted for Address",
    people: [{ first_name: "Tunde", last_name: "Okafor" }, { first_name: "Grace", last_name: "Okafor" }, { first_name: "Eli", last_name: "Okafor" }, { first_name: "Ruth", last_name: "Okafor" }] },
  { family_name: "Jess & Taylor Brooks", affiliation: "Dylan Friends", live_in_town: "No", hotel_status: "Yes Host Hotel", city: "Denver", state: "CO",
    people: [{ first_name: "Jess", last_name: "Brooks", role: "Wedding Party", rsvp: "Yes", rd_invited: 1, rd_status: "TBD", afterparty: "Yes" }, { first_name: "Taylor", last_name: "Brooks", rsvp: "No" }] },
  { family_name: "Pastor Mike Allen", affiliation: "Mutual", live_in_town: "Yes", hotel_status: "n/a", hotel_swag: "n/a", transportation: "Self", city: "Fishers", state: "IN",
    people: [{ first_name: "Mike", last_name: "Allen", role: "Officiant", rsvp: "Yes", rd_invited: 2, rd_status: "Yes", table_status: "Seated", table_number: "3" }] },
  { family_name: "Uncle Vince Duca", affiliation: "Joe Family", live_in_town: "No", hotel_status: "Maybe Host Hotel", city: "Tampa", state: "FL",
    people: [{ first_name: "Vince", last_name: "Duca", invited: 2 }] },
];

// Sample B-list for demo mode.
window.DEMO_BLIST = [
  { family_name: "The Dana Wright Family", people: "Dana Wright\nChris Wright", affiliation: "Joe Friends", would_replace: "a Joe friend who declined", city: "Indianapolis", state: "IN", notes: "Work friends, would love to invite" },
  { family_name: "Marcus Bell", people: "Marcus Bell\nGuest of Marcus Bell", affiliation: "Dylan Friends", would_replace: "a Dylan friend who declined", city: "Philadelphia", state: "PA" },
  { family_name: "Aunt Carol & Uncle Ted", people: "Carol Duca\nTed Duca", affiliation: "Joe Family", city: "Tampa", state: "FL", notes: "Only if we have room" },
];
