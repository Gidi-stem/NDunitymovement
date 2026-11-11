/** Columns admins may read from `applications` (everything except access_token_hash). Mirrors the SQL GRANT. */
export const APPLICATION_COLUMNS =
  "id, reference, status, full_name, preferred_name, phone, email, date_of_birth, sex, state_of_residence, lga, ward, community, state_of_origin, residential_address, occupation, preferred_chapter_state, lga_chapter, ward_unit, category_id, areas_of_interest, areas_other, next_of_kin_name, next_of_kin_phone, declaration_accuracy, declaration_constitution, declaration_rules, declaration_no_guarantee, privacy_ack, consent_processing, signature_name, declaration_date, chapter_id, scope_state, scope_lga, membership_number, member_photo_path, correction_note, review_note, reviewed_by, reviewed_at, approved_at, expires_on, submitted_at, updated_at";

export const LIST_COLUMNS =
  "id, reference, status, full_name, phone, email, state_of_residence, lga, scope_state, scope_lga, chapter_id, category_id, membership_number, submitted_at";

/** Make user text safe to embed in a PostgREST `.or()` / `ilike` filter. */
export const safeSearch = (q: string) => q.replace(/[^\p{L}\p{N}@.\-+ ]/gu, "").trim().slice(0, 80);
