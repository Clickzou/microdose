-- BIEN Microdose — téléphone obligatoire dans le formulaire de contact (30/09/2026)
--
-- Les messages déjà reçus n'ont pas de numéro : la colonne reste nullable en base,
-- l'API l'exige pour les nouveaux messages.
-- À exécuter AVANT de déployer le code qui écrit cette colonne.

alter table contact_messages
  add column if not exists phone text;
