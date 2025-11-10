-- Migration pour ajouter les nouveaux types de documents
-- Date: 2024-01-XX
-- Description: Ajoute les nouveaux types de documents requis selon les catégories de produits

-- Modifier l'enum type_document pour inclure les nouveaux types
ALTER TABLE `documents_entreprise` 
MODIFY COLUMN `type_document` ENUM(
  'certificat_enregistrement',
  'certificat_fiscal', 
  'piece_identite_representant',
  'licence_commerciale',
  'certificat_origine',
  'conformite_ce',
  'certificat_sanitaire',
  'autre'
) NOT NULL;

-- Ajouter un commentaire pour documenter les types
ALTER TABLE `documents_entreprise` 
MODIFY COLUMN `type_document` ENUM(
  'certificat_enregistrement',
  'certificat_fiscal', 
  'piece_identite_representant',
  'licence_commerciale',
  'certificat_origine',
  'conformite_ce',
  'certificat_sanitaire',
  'autre'
) NOT NULL COMMENT 'Type de document: certificat_enregistrement=Obligatoire pour tous, certificat_fiscal=Obligatoire pour tous, piece_identite_representant=Obligatoire pour tous, licence_commerciale=Requis pour produits pharmaceutiques/alcoolisés/agroalimentaires sensibles/électroniques, certificat_origine=Requis pour produits alimentaires/agricoles/manufacturés, conformite_ce=Requis pour produits électroniques/jouets/cosmétiques/EPI, certificat_sanitaire=Requis pour produits alimentaires frais/cosmétiques/pharmaceutiques, autre=Document spécifique';
