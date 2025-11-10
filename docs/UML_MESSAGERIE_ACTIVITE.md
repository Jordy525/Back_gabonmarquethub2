# 🔄 Diagramme d'Activité UML - Système de Messagerie
## GabMarketHub - Flux d'Activités Temps Réel

## 📱 **Flux Principal : Envoi de Message**

```plantuml
@startuml Envoi_Message
!theme plain
skinparam backgroundColor white
skinparam activity {
    BackgroundColor lightblue
    BorderColor black
    FontColor black
}
skinparam diamond {
    BackgroundColor lightyellow
    BorderColor black
}

start
:👤 Utilisateur ouvre conversation;

if (🔐 Utilisateur authentifié ?) then (non)
    :🚫 Rediriger vers login;
    stop
else (oui)
    :📡 Établir connexion WebSocket;
    :🏠 Rejoindre room conversation;
    :📊 Charger historique messages;
    :✅ Interface prête;
endif

:✍️ Utilisateur tape message;

repeat
    if (📝 Message valide ?) then (non)
        :❌ Afficher erreur validation;
    else (oui)
        :📤 Envoyer message via Socket.IO;
        :🔒 Valider permissions conversation;
        
        if (👥 Participant autorisé ?) then (non)
            :🚫 Erreur d'autorisation;
            stop
        else (oui)
            fork
                :💾 Sauvegarder message en DB;
                if (Erreur DB ?) then (oui)
                    :� Rollback transaction;
                    :⚠️ Notifier erreur utilisateur;
                    stop
                endif
            fork again
                :� Diffuser message dans room;
                if (Erreur Socket ?) then (oui)
                    :🔄 Retry diffusion;
                    :⚠️ Notifier erreur utilisateur;
                    stop
                endif
            fork again
                :� Envoyer notifications push;
                if (Erreur Push ?) then (oui)
                    :📝 Logger erreur notification;
                endif
            end fork
            
            :✅ Confirmer envoi à l'expéditeur;
            
            if (📱 Destinataire en ligne ?) then (oui)
                :📨 Affichage temps réel;
            else (non)
                :📪 Notification push différée;
            endif
            
            :👁️ Accusé de réception;
        endif
    endif
repeat while (Continuer ?) is (oui)

:🏁 Fin du processus;
stop

@enduml
```

## 📎 **Flux Secondaire : Envoi de Fichier**

```plantuml
@startuml Envoi_Fichier
!theme plain
skinparam backgroundColor white

start
:📎 Utilisateur sélectionne fichier;

if (📏 Taille < limite ?) then (non)
    :❌ Erreur: fichier trop volumineux;
    stop
else (oui)
    if (🎭 Type de fichier autorisé ?) then (non)
        :❌ Erreur: type non supporté;
        stop
    else (oui)
        :⬆️ Upload fichier sur serveur;
        
        if (📤 Upload réussi ?) then (non)
            :💥 Erreur upload;
            stop
        else (oui)
            fork
                :🛡️ Scanner antivirus;
                if (🦠 Fichier sûr ?) then (non)
                    :🚫 Quarantaine + notification;
                    stop
                endif
            fork again
                :🖼️ Générer miniature si image;
            end fork
            
            :💾 Sauvegarder métadonnées;
            :📨 Créer message type 'file';
            :📡 Diffuser dans conversation;
            :✅ Confirmation à l'utilisateur;
        endif
    endif
endif

stop
@enduml
```

## 👁️ **Flux : Gestion de Présence**

```plantuml
@startuml Gestion_Presence
!theme plain
skinparam backgroundColor white

start
:🔗 Connexion WebSocket établie;
:📊 Récupérer statut utilisateur;
:📡 Diffuser présence 'en ligne';
:⏰ Démarrer timer d'activité;

repeat
    if (🖱️ Activité détectée ?) then (oui)
        :🔄 Réinitialiser timer;
        
        if (✍️ Utilisateur tape ?) then (oui)
            :📝 Diffuser 'en train d'écrire';
            :⏱️ Timer frappe 3s;
            
            if (⏹️ Arrêt de frappe ?) then (oui)
                :📝 Diffuser 'arrêt frappe';
            endif
        endif
        
    else (non)
        if (⏳ Timer expiré ?) then (oui)
            :😴 Marquer comme 'absent';
            :📡 Diffuser changement statut;
            
            if (🔌 Connexion active ?) then (non)
                :📴 Marquer hors ligne;
                :💾 Sauvegarder dernière activité;
                :📡 Diffuser statut 'hors ligne';
                :🏁 Fin monitoring;
                stop
            else (oui)
                :⏰ Continuer monitoring;
            endif
        endif
    endif
repeat while (Connexion active ?) is (oui)

stop
@enduml
```

## 🔍 **Flux : Recherche dans l'Historique**

```plantuml
@startuml Recherche_Historique
!theme plain
skinparam backgroundColor white

start
:🔍 Utilisateur saisit recherche;

if (📝 Requête valide ?) then (non)
    :❌ Erreur validation;
    stop
else (oui)
    :⏳ Afficher indicateur loading;
    :🔍 Recherche full-text en DB;
    
    if (📊 Résultats trouvés ?) then (non)
        :📭 Aucun résultat;
        :✅ Recherche terminée;
        stop
    else (oui)
        :📄 Paginer résultats;
        :🎨 Surligner termes recherchés;
        :📱 Afficher résultats;
        
        repeat
            if (🎯 Clic sur résultat ?) then (oui)
                :� Naviguer vers message;
                :🎨 Surligner message cible;
                :📜 Scroller vers message;
                :✅ Recherche terminée;
                stop
            else if (�📖 Plus de pages ?) then (oui)
                :⬇️ Bouton 'Charger plus';
                
                if (👆 Clic 'Charger plus' ?) then (oui)
                    :📄 Page suivante;
                    :🔍 Recherche full-text en DB;
                    :📄 Paginer résultats;
                    :🎨 Surligner termes recherchés;
                    :� Afficher résultats;
                endif
            else (non)
                :✅ Recherche terminée;
                stop
            endif
        repeat while (Interaction utilisateur ?) is (oui)
    endif
endif

stop
@enduml
```

## 🔔 **Flux : Système de Notifications**

```plantuml
@startuml Systeme_Notifications
!theme plain
skinparam backgroundColor white

start
:📨 Nouveau message reçu;

if (👤 Destinataire en ligne ?) then (oui)
    :📱 Notification temps réel;
    
    if (� Notifications activées ?) then (oui)
        fork
            :⚙️ Paramètres utilisateur;
            :📋 Vérifier préférences;
            
            if (� Heures silencieuses ?) then (oui)
                :🔇 Reporter notification;
                :⏰ Attendre fin période;
            endif
        fork again
            :🔔 Son + popup navigateur;
        end fork
    else (non)
        :👁️ Badge discret;
    endif
    
else (non)
    :📪 Stocker notification différée;
    :📱 Notification push mobile;
    
    if (📧 Email activé ?) then (oui)
        :📬 Envoyer email différé;
    else (non)
        :💾 En attente reconnexion;
        
        repeat
            if (🔌 Utilisateur se reconnecte ?) then (oui)
                :📄 Synchroniser notifications;
                :🔔 Afficher toutes non lues;
            endif
        repeat while (Utilisateur hors ligne ?) is (oui)
    endif
endif

repeat
    if (📖 Message lu ?) then (oui)
        :✅ Marquer comme lu;
        :📊 Logger métrique 'lu';
        :🏁 Fin processus;
        stop
    else (non)
        if (⏰ Rappel automatique ?) then (oui)
            :⏰ Programmer rappel 1h;
            :⏰ Timer rappel expiré;
            :� Notification rappel;
        else (non)
            :🏁 Fin processus;
            stop
        endif
    endif
repeat while (Message non lu ?) is (oui)

stop
@enduml
```

## 📊 **Métriques et Analytics**

```plantuml
@startuml Metriques_Analytics
!theme plain
skinparam backgroundColor white

start
:📱 Événement messagerie;
:📊 Capturer métrique;

switch (📈 Type d'événement ?)
case (Message envoyé)
    :📤 Incrémenter compteur messages;
case (Utilisateur connecté)
    :👥 Mettre à jour utilisateurs actifs;
case (Fichier uploadé)
    :📎 Tracker taille/type fichier;
case (Temps de réponse)
    :⏱️ Enregistrer latence;
endswitch

:💾 Stocker en temps réel;

if (🎯 Seuil alerte atteint ?) then (oui)
    :🚨 Déclencher alerte;
    : Notifier administrateurs;
endif

:📊 Agrégation données;
:📈 Mettre à jour dashboard;

if (📅 Rapport quotidien ?) then (oui)
    :📄 Générer rapport;
    :📬 Envoyer rapport;
endif

:🔄 Continuer monitoring;

repeat while (Système actif ?) is (oui)

stop
@enduml
```

---

Ces diagrammes d'activité UML montrent les différents flux du système de messagerie temps réel, couvrant tous les aspects depuis l'envoi de messages jusqu'à la gestion des notifications et des métriques, en passant par la présence utilisateur et la recherche dans l'historique.