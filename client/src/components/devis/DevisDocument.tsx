import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';
import { DevisState, UNITE_LABELS } from '@/types/devis';
import {
  totalHTLigne,
  formatEuros,
  getLignes,
} from '@/lib/devisCalculs';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    paddingTop: 30,
    paddingBottom: 40,
    paddingHorizontal: 35,
    color: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  logo: { width: 80, height: 40, objectFit: 'contain' },
  headerRight: { alignItems: 'flex-end' },
  devisTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#1d4ed8',
  },
  infoRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  infoBox: {
    flex: 1,
    padding: 8,
    border: '1pt solid #e5e7eb',
    borderRadius: 4,
  },
  infoLabel: {
    fontSize: 7,
    color: '#6b7280',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  infoValue: { fontSize: 9 },
  table: { marginTop: 16 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1d4ed8',
    padding: '5 4',
    borderRadius: '2 2 0 0',
  },
  tableHeaderText: {
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
  },
  tableRow: {
    flexDirection: 'row',
    padding: '4 4',
    borderBottom: '0.5pt solid #e5e7eb',
  },
  tableRowAlt: { backgroundColor: '#f9fafb' },
  sectionRow: {
    flexDirection: 'row',
    padding: '5 4',
    backgroundColor: '#e5e7eb',
    fontFamily: 'Helvetica-Bold',
  },
  colDesignation: { flex: 4 },
  colUnite: { width: 35, textAlign: 'center' },
  colQte: { width: 35, textAlign: 'right' },
  colPU: { width: 55, textAlign: 'right' },
  colTVA: { width: 40, textAlign: 'center' },
  colTotal: { width: 60, textAlign: 'right' },
  recapContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  recapBox: {
    width: 200,
    border: '1pt solid #e5e7eb',
    borderRadius: 4,
    padding: 8,
  },
  recapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  recapTTCRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderTop: '1pt solid #1d4ed8',
    marginTop: 4,
  },
  recapTTCText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: '#1d4ed8',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 35,
    right: 35,
    borderTop: '0.5pt solid #e5e7eb',
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: '#9ca3af',
  },
  signatureBox: {
    marginTop: 20,
    border: '1pt solid #e5e7eb',
    borderRadius: 4,
    padding: 12,
  },
  mentionsText: {
    fontSize: 7,
    color: '#6b7280',
    marginTop: 12,
    lineHeight: 1.5,
  },
});

interface Props {
  state: DevisState;
}

export const DevisDocument = React.memo(function DevisDocument({ state }: Props) {
  const {
    emetteur,
    client,
    details,
    items,
    recap,
    conditions,
    mentions,
  } = state;
  const lignes = getLignes(items);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            {emetteur.logoBase64 && (
              <Image src={emetteur.logoBase64} style={styles.logo} />
            )}
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 11 }}>
              {emetteur.raisonSociale}
            </Text>
            <Text>{emetteur.adresse}</Text>
            <Text>
              {emetteur.codePostal} {emetteur.ville}
            </Text>
            <Text>{emetteur.telephone}</Text>
            <Text>{emetteur.email}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.devisTitle}>DEVIS</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold', marginTop: 4 }}>
              N° {details.numeroDevis}
            </Text>
            <Text>Date : {details.dateRedaction}</Text>
            <Text>Validité : {details.dateValidite}</Text>
            {details.lieuExecution && (
              <Text>Lieu : {details.lieuExecution}</Text>
            )}
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Émetteur</Text>
            <Text>{emetteur.siret ? `SIRET : ${emetteur.siret}` : ''}</Text>
            <Text>{emetteur.tvaIntra ? `TVA : ${emetteur.tvaIntra}` : ''}</Text>
            <Text>{emetteur.formeJuridique}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Client</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{client.nom}</Text>
            <Text>{client.adresse}</Text>
            <Text>
              {client.codePostal} {client.ville}
            </Text>
            <Text>{client.email}</Text>
          </View>
        </View>

        {details.descriptionChantier ? (
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.infoLabel}>Objet</Text>
            <Text>{details.descriptionChantier}</Text>
          </View>
        ) : null}

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colDesignation]}>
              Désignation
            </Text>
            <Text style={[styles.tableHeaderText, styles.colUnite]}>Unité</Text>
            <Text style={[styles.tableHeaderText, styles.colQte]}>Qté</Text>
            <Text style={[styles.tableHeaderText, styles.colPU]}>PU HT</Text>
            <Text style={[styles.tableHeaderText, styles.colTVA]}>TVA</Text>
            <Text style={[styles.tableHeaderText, styles.colTotal]}>
              Total HT
            </Text>
          </View>

          {items.map((item, idx) => {
            if (item.type === 'section') {
              return (
                <View key={item.id} style={styles.sectionRow}>
                  <Text style={styles.colDesignation}>{item.titre}</Text>
                </View>
              );
            }
            const ht = totalHTLigne(item);
            return (
              <View
                key={item.id}
                style={[
                  styles.tableRow,
                  idx % 2 === 0 ? styles.tableRowAlt : {},
                ]}
              >
                <Text style={styles.colDesignation}>
                  {item.designation || '—'}
                </Text>
                <Text style={styles.colUnite}>{UNITE_LABELS[item.unite]}</Text>
                <Text style={styles.colQte}>{item.quantite}</Text>
                <Text style={styles.colPU}>
                  {formatEuros(item.prixUnitaireHT)}
                </Text>
                <Text style={styles.colTVA}>{item.tauxTVA} %</Text>
                <Text style={styles.colTotal}>{formatEuros(ht)}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.recapContainer}>
          <View style={styles.recapBox}>
            <View style={styles.recapRow}>
              <Text>Total HT</Text>
              <Text>{formatEuros(recap.totalHT)}</Text>
            </View>
            {recap.remiseType && recap.remiseValeur > 0 && (
              <View style={styles.recapRow}>
                <Text>Remise</Text>
                <Text>
                  {recap.remiseType === 'pourcentage'
                    ? `- ${recap.remiseValeur} %`
                    : `- ${formatEuros(recap.remiseValeur)}`}
                </Text>
              </View>
            )}
            {recap.detailTVA.map((t) => (
              <View key={t.taux} style={styles.recapRow}>
                <Text>TVA {t.taux} %</Text>
                <Text>{formatEuros(t.montantTVA)}</Text>
              </View>
            ))}
            <View style={styles.recapTTCRow}>
              <Text style={styles.recapTTCText}>TOTAL TTC</Text>
              <Text style={styles.recapTTCText}>
                {formatEuros(recap.totalTTC)}
              </Text>
            </View>
            {recap.acompteType && recap.acompteMontant > 0 && (
              <View style={{ ...styles.recapRow, marginTop: 6 }}>
                <Text>Acompte à la commande</Text>
                <Text>{formatEuros(recap.acompteMontant)}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ marginTop: 16, fontSize: 8 }}>
          <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 4 }}>
            Conditions de réalisation
          </Text>
          <Text>
            Délai d'exécution : {conditions.delaiExecution || 'À définir'}
          </Text>
          <Text>
            Paiement : {conditions.modePaiement} — {conditions.delaiPaiement}
          </Text>
          <Text>Pénalités de retard : {conditions.penalitesRetard}</Text>
          <Text>
            Indemnité forfaitaire de recouvrement :{' '}
            {conditions.indemniteRecouvrement}
          </Text>
          {conditions.reservePropriete && (
            <Text>Clause de réserve de propriété applicable.</Text>
          )}
          {conditions.notes ? (
            <Text style={{ marginTop: 4 }}>{conditions.notes}</Text>
          ) : null}
        </View>

        <View style={styles.mentionsText}>
          {mentions.assuranceDecennaleActive &&
            emetteur.assuranceDecennale && (
              <Text>
                Assurance décennale n° {emetteur.assuranceDecennale} — conforme
                aux articles L.241-1 et suivants du Code des assurances.
              </Text>
            )}
          {mentions.rgeActive && (
            <Text>
              Entreprise reconnue Garant de l'Environnement (RGE).
            </Text>
          )}
          {mentions.tva293BActive && (
            <Text>TVA non applicable, article 293 B du CGI.</Text>
          )}
          {mentions.garantieParfaitAchevement && (
            <Text>
              Garantie de parfait achèvement : 1 an à compter de la réception.
            </Text>
          )}
          {mentions.garantieBiennale && (
            <Text>
              Garantie biennale : 2 ans sur les éléments d'équipement.
            </Text>
          )}
          {mentions.garantieDecennale && (
            <Text>
              Garantie décennale : 10 ans sur les éléments structurels.
            </Text>
          )}
        </View>

        <View style={styles.signatureBox}>
          <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 8 }}>
            Bon pour accord
          </Text>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <View>
              <Text>Date : _______________</Text>
              <Text style={{ marginTop: 20 }}>Signature client :</Text>
              <View
                style={{
                  marginTop: 30,
                  width: 120,
                  height: 0.5,
                  backgroundColor: '#9ca3af',
                }}
              />
            </View>
            <View>
              <Text>Pour {emetteur.raisonSociale}</Text>
              <Text style={{ marginTop: 20 }}>Cachet et signature :</Text>
              <View
                style={{
                  marginTop: 30,
                  width: 120,
                  height: 0.5,
                  backgroundColor: '#9ca3af',
                }}
              />
            </View>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>SIRET : {emetteur.siret}</Text>
          {emetteur.tvaIntra && <Text>TVA : {emetteur.tvaIntra}</Text>}
          <Text>{emetteur.formeJuridique}</Text>
          <Text>Devis valable jusqu'au {details.dateValidite}</Text>
        </View>
      </Page>
    </Document>
  );
});
