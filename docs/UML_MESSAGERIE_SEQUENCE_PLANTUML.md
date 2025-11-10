# 📱 Diagramme de Séquence UML PlantUML - Système de Messagerie Temps Réel
## GabMarketHub - Socket.IO Communication

```plantuml
@startuml Messagerie_Sequence
!theme plain
skinparam backgroundColor white

participant "👤 Acheteur" as A
participant "🔌 Socket.IO Client A" as SA
participant "🖥️ Serveur Socket.IO" as S
participant "🗄️ Base de Données MySQL" as DB
participant "🔌 Socket.IO Client F" as SF
participant "🏢 Fournisseur" as F

== 🔗 Établissement de la connexion WebSocket ==

A -> SA: Se connecter à la plateforme
SA -> S: socket.connect() avec auth token
S -> DB: Vérifier authentification utilisateur
DB --> S: Données utilisateur validées
S -> SA: Connexion établie + user_id
SA --> A: État: Connecté

F -> SF: Se connecter à la plateforme
SF -> S: socket.connect() avec auth token
S -> DB: Vérifier authentification utilisateur
DB --> S: Données utilisateur validées
S -> SF: Connexion établie + user_id
SF --> F: État: Connecté

== 💬 Initiation d'une conversation ==

A -> SA: Démarrer conversation avec fournisseur
SA -> S: emit('join_conversation', {receiver_id: F.id, product_id?})

S -> DB: Créer/Récupérer conversation
note over DB: INSERT/SELECT conversations
DB --> S: conversation_id, participants

S -> S: Créer room "conv_123"
S -> SA: socket.join("conv_123")
S -> SF: socket.join("conv_123")

S -> SA: emit('conversation_joined', {conversation_id, participants})
S -> SF: emit('conversation_joined', {conversation_id, participants})

SA --> A: Interface conversation ouverte
SF --> F: Notification nouvelle conversation

== 📨 Envoi et réception de messages ==

A -> SA: Envoyer message "Bonjour, je suis intéressé"
SA -> S: emit('send_message', {conversation_id, content, type: 'text'})

S -> DB: Sauvegarder message
note over DB: INSERT INTO messages\n(conversation_id, sender_id, content, type, created_at)
DB --> S: message_id, timestamp

S -> S: to("conv_123").emit('new_message', message_data)
S -> SA: emit('message_sent', {message_id, status: 'delivered'})
S -> SF: emit('new_message', {message_id, sender_id, content, timestamp})

SA --> A: Message affiché avec statut "envoyé"
SF --> F: Nouveau message affiché + son notification

== 📎 Envoi de fichier/image ==

F -> SF: Joindre image produit
SF -> S: emit('send_file', {conversation_id, file_data, type: 'image'})

S -> S: Traiter upload fichier
S -> DB: Sauvegarder métadonnées fichier
DB --> S: file_url, message_id

S -> S: to("conv_123").emit('new_message', {type: 'file', file_url, filename})
S -> SA: emit('new_message', {message_id, type: 'file', file_url})
S -> SF: emit('message_sent', {message_id, status: 'delivered'})

SA --> A: Image/fichier affiché
SF --> F: Confirmation envoi

== 🔔 Notifications push ==

F -> SF: Se déconnecter (ferme navigateur)
SF -> S: socket.disconnect()
S -> S: Marquer utilisateur hors ligne
S -> SA: emit('user_offline', {user_id: F.id})

A -> SA: Envoyer message à F (hors ligne)
SA -> S: emit('send_message', {conversation_id, content})

S -> DB: Sauvegarder message
DB --> S: message_id

S -> S: Destinataire hors ligne - déclencher notification push
S -> S: Service de notifications externes (FCM/APNS)

note over S: Push notification:\n"Nouveau message de [Acheteur]"

S -> SA: emit('message_sent', {status: 'delivered_offline'})
SA --> A: Message marqué "envoyé" avec indicateur hors ligne

== 🔄 Reconnexion et synchronisation ==

F -> SF: Se reconnecte plus tard
SF -> S: socket.connect() avec auth token
S -> DB: Récupérer messages non lus

note over DB: SELECT * FROM messages\nWHERE conversation_id IN (...)\nAND read_at IS NULL\nAND receiver_id = F.id
DB --> S: Liste messages non lus

S -> SF: emit('unread_messages', {messages, conversations})
S -> SF: emit('user_online', {user_id: F.id, status: 'online'})
S -> SA: emit('user_online', {user_id: F.id, status: 'online'})

SF --> F: Badge notifications + messages non lus
SA --> A: Indicateur "F en ligne"

== ⚡ Gestion des erreurs et reconnexion ==

SA -> S: emit('send_message') - Connexion perdue
S --> SA: Timeout / Erreur réseau

SA -> SA: Tentative de reconnexion automatique
SA -> S: socket.connect() - Retry
S --> SA: Connexion rétablie

SA -> S: emit('sync_pending_messages') - Resynchroniser
S -> DB: Vérifier messages en attente
DB --> S: État des messages
S -> SA: emit('sync_complete', {pending_messages})

SA --> A: Messages synchronisés + indicateurs de statut mis à jour

== 📊 Métriques et analytics temps réel ==

S -> DB: Logger événements messagerie
note over DB: INSERT INTO message_analytics\n(event_type, user_id, conversation_id, timestamp)

S -> S: Calculer métriques temps réel
note over S: - Messages/minute\n- Utilisateurs actifs\n- Temps de réponse moyen\n- Taux de conversion conversations

@enduml
```

## 🏗️ Architecture Détaillée PlantUML

### 📡 **Connexions et Rooms**
```plantuml
@startuml Architecture_Connexions
!theme plain

cloud "🌐 Internet" as internet
node "💻 Client Acheteur" as clientA
node "💻 Client Fournisseur" as clientF
node "🖥️ Serveur Socket.IO" as server
database "🗄️ MySQL" as db
cloud "📱 Service Push" as push

clientA -down-> internet : WebSocket
clientF -down-> internet : WebSocket
internet -down-> server : Authentification
server -right-> db : Validation
server -down-> push : Notifications
push -down-> clientA : FCM/APNS
push -down-> clientF : FCM/APNS

package "Rooms Management" {
    rectangle "🏠 Room conv_123" as room
    server -down-> room
    room -up-> clientA : Messages
    room -up-> clientF : Messages
}

@enduml
```

### 🔄 **États des Messages**
```plantuml
@startuml Etats_Messages
!theme plain
skinparam state {
    BackgroundColor lightblue
    BorderColor black
}

state "✍️ Composing" as composing
state "📤 Sending" as sending
state "✅ Sent" as sent
state "📨 Delivered" as delivered
state "👁️ Read" as read
state "❌ Failed" as failed
state "⏳ Pending" as pending

[*] --> composing : Utilisateur tape
composing --> sending : Clic Envoyer
sending --> sent : Confirmé serveur
sent --> delivered : Reçu destinataire
delivered --> read : Message lu
read --> [*]

sending --> failed : Erreur réseau
failed --> pending : En attente retry
pending --> sending : Reconnexion

@enduml
```

---

*Diagramme généré pour GabMarketHub - Système de Messagerie Temps Réel*
*Version PlantUML compatible - Novembre 2025*