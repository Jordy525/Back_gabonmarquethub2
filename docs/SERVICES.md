# 🔧 Documentation des Services

## 🌐 Service API Principal

### api.ts - Client HTTP Central
Configuration Axios centralisée avec intercepteurs

```typescript
// Configuration de base
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Intercepteur de requête - Ajout automatique du token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur de réponse - Gestion des erreurs
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expiré - redirection vers login
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

## 🔐 Service d'Authentification

### authService.ts - Gestion Complète de l'Auth
Service centralisé pour toutes les opérations d'authentification

```typescript
interface LoginCredentials {
  email: string;
  mot_de_passe: string;
}

interface RegisterData {
  email: string;
  mot_de_passe: string;
  nom: string;
  prenom?: string;
  telephone?: string;
  role_id: number;
  entreprise?: EnterpriseData;
}

class AuthService {
  // Connexion utilisateur
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await api.post('/auth/login', credentials);
      
      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token);
        // Déclencher événement pour les hooks
        window.dispatchEvent(new Event('tokenChanged'));
      }
      
      return response.data;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  // Inscription utilisateur
  async register(userData: RegisterData): Promise<RegisterResponse> {
    try {
      const response = await api.post('/auth/register', userData);
      
      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token);
        window.dispatchEvent(new Event('tokenChanged'));
      }
      
      return response.data;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  // Récupération profil utilisateur
  async getCurrentUser(): Promise<User> {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  // Déconnexion
  logout(): void {
    localStorage.removeItem('authToken');
    window.dispatchEvent(new Event('tokenChanged'));
  }

  // Vérification validité token
  isTokenValid(): boolean {
    const token = localStorage.getItem('authToken');
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  // Gestion des erreurs d'authentification
  private handleAuthError(error: any): Error {
    if (error.response?.data?.error) {
      return new Error(error.response.data.error);
    }
    if (error.response?.status === 401) {
      return new Error('Identifiants invalides');
    }
    return new Error('Erreur de connexion au serveur');
  }
}

export default new AuthService();
```

## 🛍️ Service Produits

### productService.ts - Gestion des Produits
CRUD complet pour les produits avec upload d'images

```typescript
interface ProductFilters {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'price_asc' | 'price_desc' | 'date_desc' | 'popularity';
}

interface CreateProductData {
  nom: string;
  description_longue: string;
  prix_unitaire: number;
  moq: number;
  stock_disponible: number;
  categorie_id: number;
  images?: File[];
  couleurs_disponibles?: string[];
  certifications?: string[];
}

class ProductService {
  // Liste des produits avec filtres
  async getProducts(filters: ProductFilters = {}): Promise<ProductsResponse> {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await api.get(`/products?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw new Error('Erreur lors de la récupération des produits');
    }
  }

  // Produits vedettes
  async getFeaturedProducts(): Promise<Product[]> {
    try {
      const response = await api.get('/products/featured');
      return response.data.products;
    } catch (error) {
      throw new Error('Erreur lors de la récupération des produits vedettes');
    }
  }

  // Détail d'un produit
  async getProduct(id: number): Promise<Product> {
    try {
      const response = await api.get(`/products/${id}`);
      return response.data.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Produit non trouvé');
      }
      throw new Error('Erreur lors de la récupération du produit');
    }
  }

  // Créer un produit avec images
  async createProduct(productData: CreateProductData): Promise<CreateProductResponse> {
    try {
      const formData = new FormData();
      
      // Ajouter les données du produit
      Object.entries(productData).forEach(([key, value]) => {
        if (key === 'images') return; // Traité séparément
        
        if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else if (value !== undefined) {
          formData.append(key, value.toString());
        }
      });
      
      // Ajouter les images
      if (productData.images) {
        productData.images.forEach((image) => {
          formData.append('images', image);
        });
      }

      const response = await api.post('/products', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } catch (error) {
      throw this.handleProductError(error);
    }
  }

  // Modifier un produit
  async updateProduct(id: number, productData: Partial<CreateProductData>): Promise<void> {
    try {
      await api.put(`/products/${id}`, productData);
    } catch (error) {
      throw this.handleProductError(error);
    }
  }

  // Supprimer un produit
  async deleteProduct(id: number): Promise<void> {
    try {
      await api.delete(`/products/${id}`);
    } catch (error) {
      throw this.handleProductError(error);
    }
  }

  // Ajouter des images à un produit existant
  async addProductImages(id: number, images: File[]): Promise<void> {
    try {
      const formData = new FormData();
      images.forEach((image) => {
        formData.append('images', image);
      });

      await api.post(`/products/${id}/images`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    } catch (error) {
      throw this.handleProductError(error);
    }
  }

  // Recherche de produits
  async searchProducts(query: string): Promise<Product[]> {
    try {
      const response = await api.get(`/products?search=${encodeURIComponent(query)}`);
      return response.data.products;
    } catch (error) {
      throw new Error('Erreur lors de la recherche');
    }
  }

  private handleProductError(error: any): Error {
    if (error.response?.data?.error) {
      return new Error(error.response.data.error);
    }
    return new Error('Erreur lors de l\'opération sur le produit');
  }
}

export default new ProductService();
```

## 💬 Service de Messagerie

### messageService.ts - Communication Temps Réel
Gestion complète des conversations et messages

```typescript
interface CreateConversationData {
  fournisseur_id: number;
  sujet: string;
  produit_id?: number;
  message_initial: string;
}

interface SendMessageData {
  contenu: string;
  conversation_id: number;
}

class MessageService {
  // Liste des conversations
  async getConversations(): Promise<Conversation[]> {
    try {
      const response = await api.get('/conversations');
      return response.data;
    } catch (error) {
      throw new Error('Erreur lors de la récupération des conversations');
    }
  }

  // Messages d'une conversation
  async getMessages(conversationId: number): Promise<Message[]> {
    try {
      const response = await api.get(`/conversations/${conversationId}/messages`);
      return response.data.messages;
    } catch (error) {
      throw new Error('Erreur lors de la récupération des messages');
    }
  }

  // Créer une nouvelle conversation
  async createConversation(data: CreateConversationData): Promise<Conversation> {
    try {
      const response = await api.post('/conversations', data);
      return response.data;
    } catch (error) {
      throw new Error('Erreur lors de la création de la conversation');
    }
  }

  // Envoyer un message
  async sendMessage(data: SendMessageData): Promise<Message> {
    try {
      const response = await api.post(`/conversations/${data.conversation_id}/messages`, {
        contenu: data.contenu
      });
      return response.data;
    } catch (error) {
      throw new Error('Erreur lors de l\'envoi du message');
    }
  }

  // Marquer les messages comme lus
  async markAsRead(conversationId: number): Promise<void> {
    try {
      await api.patch(`/conversations/${conversationId}/read`);
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error);
    }
  }

  // Nombre de messages non lus
  async getUnreadCount(): Promise<number> {
    try {
      const response = await api.get('/messages/unread-count');
      return response.data.count;
    } catch (error) {
      return 0;
    }
  }

  // Recherche dans les conversations
  async searchConversations(query: string): Promise<Conversation[]> {
    try {
      const response = await api.get(`/conversations/search?q=${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      throw new Error('Erreur lors de la recherche');
    }
  }
}

export default new MessageService();
```

## 🔌 Service Socket.IO

### socketService.ts - Communication Temps Réel
Gestion des connexions WebSocket pour la messagerie

```typescript
import { io, Socket } from 'socket.io-client';

interface SocketEvents {
  // Événements entrants
  'message_received': (message: Message) => void;
  'user_typing': (data: { userId: number; userName: string }) => void;
  'user_stopped_typing': (data: { userId: number }) => void;
  'conversation_updated': (conversation: Conversation) => void;
  'notification_received': (notification: Notification) => void;
  
  // Événements sortants
  'join_conversation': (conversationId: number) => void;
  'leave_conversation': (conversationId: number) => void;
  'send_message': (message: SendMessageData) => void;
  'typing': (conversationId: number) => void;
  'stop_typing': (conversationId: number) => void;
}

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  // Connexion au serveur Socket.IO
  connect(token: string): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    this.setupEventListeners();
  }

  // Configuration des écouteurs d'événements
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Connecté au serveur Socket.IO');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Déconnecté du serveur Socket.IO:', reason);
      this.isConnected = false;
      
      if (reason === 'io server disconnect') {
        // Reconnexion manuelle nécessaire
        this.reconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('🚨 Erreur de connexion Socket.IO:', error);
      this.handleReconnection();
    });

    // Événements métier
    this.socket.on('message_received', (message: Message) => {
      this.emit('message_received', message);
    });

    this.socket.on('user_typing', (data) => {
      this.emit('user_typing', data);
    });

    this.socket.on('user_stopped_typing', (data) => {
      this.emit('user_stopped_typing', data);
    });
  }

  // Rejoindre une conversation
  joinConversation(conversationId: number): void {
    if (this.socket?.connected) {
      this.socket.emit('join_conversation', conversationId);
    }
  }

  // Quitter une conversation
  leaveConversation(conversationId: number): void {
    if (this.socket?.connected) {
      this.socket.emit('leave_conversation', conversationId);
    }
  }

  // Envoyer un message via Socket.IO
  sendMessage(message: SendMessageData): void {
    if (this.socket?.connected) {
      this.socket.emit('send_message', message);
    }
  }

  // Indicateur de frappe
  startTyping(conversationId: number): void {
    if (this.socket?.connected) {
      this.socket.emit('typing', conversationId);
    }
  }

  stopTyping(conversationId: number): void {
    if (this.socket?.connected) {
      this.socket.emit('stop_typing', conversationId);
    }
  }

  // Gestion des événements personnalisés
  private eventListeners: Map<string, Function[]> = new Map();

  on<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit<K extends keyof SocketEvents>(event: K, ...args: Parameters<SocketEvents[K]>): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(...args));
    }
  }

  // Reconnexion automatique
  private handleReconnection(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Backoff exponentiel
      
      setTimeout(() => {
        console.log(`🔄 Tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        this.reconnect();
      }, delay);
    }
  }

  private reconnect(): void {
    if (this.socket) {
      this.socket.connect();
    }
  }

  // Déconnexion propre
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Statut de connexion
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export default new SocketService();
```

## 🛒 Service Panier

### cartService.ts - Gestion du Panier
CRUD complet pour le panier d'achat

```typescript
interface CartItem {
  id: number;
  produit_id: number;
  produit_nom: string;
  quantite: number;
  prix_unitaire: number;
  total_ligne: number;
  image_principale?: string;
  stock_disponible: number;
}

interface AddToCartData {
  produit_id: number;
  quantite: number;
}

class CartService {
  // Récupérer le contenu du panier
  async getCart(): Promise<{ items: CartItem[]; total: number; nombre_articles: number }> {
    try {
      const response = await api.get('/cart');
      return response.data;
    } catch (error) {
      throw new Error('Erreur lors de la récupération du panier');
    }
  }

  // Ajouter un produit au panier
  async addToCart(data: AddToCartData): Promise<void> {
    try {
      await api.post('/cart/add', data);
    } catch (error) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error('Erreur lors de l\'ajout au panier');
    }
  }

  // Modifier la quantité d'un article
  async updateQuantity(itemId: number, quantite: number): Promise<void> {
    try {
      await api.put(`/cart/${itemId}`, { quantite });
    } catch (error) {
      throw new Error('Erreur lors de la modification de la quantité');
    }
  }

  // Supprimer un article du panier
  async removeFromCart(itemId: number): Promise<void> {
    try {
      await api.delete(`/cart/${itemId}`);
    } catch (error) {
      throw new Error('Erreur lors de la suppression de l\'article');
    }
  }

  // Vider le panier
  async clearCart(): Promise<void> {
    try {
      await api.delete('/cart/clear');
    } catch (error) {
      throw new Error('Erreur lors du vidage du panier');
    }
  }

  // Nombre d'articles dans le panier
  async getCartCount(): Promise<number> {
    try {
      const response = await api.get('/cart/count');
      return response.data.count;
    } catch (error) {
      return 0;
    }
  }
}

export default new CartService();
```


## 🔔 Service Notifications

### notificationService.ts - Gestion des Notifications
Notifications en temps réel et historique

```typescript
interface Notification {
  id: number;
  titre: string;
  message: string;
  type: 'message' | 'produit' | 'system';
  lu: boolean;
  created_at: string;
  data?: any;
}

class NotificationService {
  // Liste des notifications
  async getNotifications(): Promise<{ notifications: Notification[]; non_lues: number }> {
    try {
      const response = await api.get('/notifications');
      return response.data;
    } catch (error) {
      throw new Error('Erreur lors de la récupération des notifications');
    }
  }

  // Marquer une notification comme lue
  async markAsRead(id: number): Promise<void> {
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error);
    }
  }

  // Marquer toutes les notifications comme lues
  async markAllAsRead(): Promise<void> {
    try {
      await api.post('/notifications/mark-all-read');
    } catch (error) {
      console.error('Erreur lors du marquage global:', error);
    }
  }

  // Nombre de notifications non lues
  async getUnreadCount(): Promise<number> {
    try {
      const response = await api.get('/notifications/unread-count');
      return response.data.count;
    } catch (error) {
      return 0;
    }
  }

  // Supprimer une notification
  async deleteNotification(id: number): Promise<void> {
    try {
      await api.delete(`/notifications/${id}`);
    } catch (error) {
      throw new Error('Erreur lors de la suppression');
    }
  }
}

export default new NotificationService();
```

## 🏢 Service Entreprises

### entrepriseService.ts - Gestion des Fournisseurs
Informations et profils des entreprises

```typescript
interface Supplier {
  id: number;
  nom_entreprise: string;
  description: string;
  secteur_activite: string;
  ville: string;
  pays: string;
  nombre_produits: number;
  note_moyenne: number;
  logo_url?: string;
}

class EntrepriseService {
  // Liste des fournisseurs
  async getSuppliers(filters: {
    secteur?: string;
    ville?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ suppliers: Supplier[] }> {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });

      const response = await api.get(`/suppliers?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw new Error('Erreur lors de la récupération des fournisseurs');
    }
  }

  // Détail d'un fournisseur
  async getSupplier(id: number): Promise<Supplier> {
    try {
      const response = await api.get(`/suppliers/${id}`);
      return response.data;
    } catch (error) {
      throw new Error('Erreur lors de la récupération du fournisseur');
    }
  }

  // Mettre à jour le profil entreprise
  async updateProfile(data: Partial<Supplier>): Promise<void> {
    try {
      await api.put('/supplier/profile', data);
    } catch (error) {
      throw new Error('Erreur lors de la mise à jour du profil');
    }
  }
}

export default new EntrepriseService();
```

---

*Services conçus pour la robustesse, la réutilisabilité et la facilité de maintenance*