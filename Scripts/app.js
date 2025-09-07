// MLM Smart Contract Frontend Application

class MLMApp {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.contract = null;
        this.userAccount = null;
        
        // Contract configuration - Update these with your actual contract details
        this.contractAddress = "0x0000000000000000000000000000000000000000"; // Replace with actual contract address
        this.usdtAddress = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // USDT mainnet address
        
        // Contract ABI (simplified for the main functions)
        this.contractABI = [
            "function register(string calldata sponsorCode) external",
            "function isUserExists(address a) external view returns (bool)",
            "function getUserInfo(address a) external view returns (uint256 id, address referrer, uint256 directs, uint256 totalEarned)",
            "function getUplineLineage(address user) external view returns (address[7] memory lineage)",
            "function lastUserId() external view returns (uint256)",
            "function FEE() external view returns (uint256)"
        ];
        
        this.usdtABI = [
            "function approve(address spender, uint256 amount) external returns (bool)",
            "function allowance(address owner, address spender) external view returns (uint256)",
            "function balanceOf(address account) external view returns (uint256)"
        ];
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        await this.checkWalletConnection();
        this.updateContractAddress();
    }
    
    setupEventListeners() {
        // Connect wallet button
        document.getElementById('connectWallet').addEventListener('click', () => {
            this.connectWallet();
        });
        
        // Registration form
        document.getElementById('registrationForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.register();
        });
        
        // Approve USDT button
        document.getElementById('approveUSDT').addEventListener('click', () => {
            this.approveUSDT();
        });
    }
    
    async checkWalletConnection() {
        if (typeof window.ethereum !== 'undefined') {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    await this.connectWallet();
                }
            } catch (error) {
                console.error('Error checking wallet connection:', error);
            }
        }
    }
    
    async connectWallet() {
        try {
            if (typeof window.ethereum === 'undefined') {
                this.showAlert('Please install MetaMask to use this application', 'warning');
                return;
            }
            
            this.showLoading('Connecting to wallet...');
            
            // Request account access
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            
            // Create provider and signer
            this.provider = new ethers.providers.Web3Provider(window.ethereum);
            this.signer = this.provider.getSigner();
            this.userAccount = await this.signer.getAddress();
            
            // Create contract instances
            this.contract = new ethers.Contract(this.contractAddress, this.contractABI, this.signer);
            this.usdtContract = new ethers.Contract(this.usdtAddress, this.usdtABI, this.signer);
            
            // Update UI
            this.updateWalletUI();
            await this.loadUserData();
            await this.loadContractStats();
            
            this.hideLoading();
            this.showAlert('Wallet connected successfully!', 'success');
            
        } catch (error) {
            this.hideLoading();
            console.error('Error connecting wallet:', error);
            this.showAlert('Failed to connect wallet. Please try again.', 'error');
        }
    }
    
    updateWalletUI() {
        const connectBtn = document.getElementById('connectWallet');
        const walletAddress = document.getElementById('walletAddress');
        const connectionStatus = document.getElementById('connectionStatus');
        
        if (this.userAccount) {
            connectBtn.innerHTML = '<i class="fas fa-check me-1"></i>Connected';
            connectBtn.classList.remove('btn-outline-light');
            connectBtn.classList.add('btn-success');
            
            walletAddress.textContent = `${this.userAccount.slice(0, 6)}...${this.userAccount.slice(-4)}`;
            connectionStatus.innerHTML = '<span class="badge bg-success">Connected</span>';
        }
    }
    
    async loadUserData() {
        try {
            if (!this.contract || !this.userAccount) return;
            
            // Check if user exists
            const userExists = await this.contract.isUserExists(this.userAccount);
            
            if (userExists) {
                // Get user info
                const userInfo = await this.contract.getUserInfo(this.userAccount);
                
                // Update UI
                document.getElementById('userId').textContent = userInfo.id.toString();
                document.getElementById('directReferrals').textContent = userInfo.directs.toString();
                document.getElementById('totalEarned').textContent = `${ethers.utils.formatEther(userInfo.totalEarned)} USDT`;
                
                // Show user info section
                document.getElementById('userInfoSection').style.display = 'block';
                
                // Load upline lineage
                await this.loadUplineLineage();
            } else {
                // Hide user info section for non-registered users
                document.getElementById('userInfoSection').style.display = 'none';
            }
            
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }
    
    async loadUplineLineage() {
        try {
            const lineage = await this.contract.getUplineLineage(this.userAccount);
            const container = document.getElementById('uplineLineage');
            
            container.innerHTML = '';
            
            let hasUplines = false;
            for (let i = 0; i < lineage.length; i++) {
                if (lineage[i] !== '0x0000000000000000000000000000000000000000') {
                    hasUplines = true;
                    const lineageItem = this.createLineageItem(lineage[i], i + 1);
                    container.appendChild(lineageItem);
                }
            }
            
            if (!hasUplines) {
                container.innerHTML = `
                    <div class="text-center text-muted py-4">
                        <i class="fas fa-crown fa-3x mb-3"></i>
                        <p>You are at the top of the network!</p>
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('Error loading upline lineage:', error);
        }
    }
    
    createLineageItem(address, level) {
        const item = document.createElement('div');
        item.className = 'lineage-item fade-in-up';
        item.innerHTML = `
            <div class="level-badge">${level}</div>
            <div class="fw-bold mb-2">Level ${level}</div>
            <div class="address">${address.slice(0, 6)}...${address.slice(-4)}</div>
        `;
        return item;
    }
    
    async loadContractStats() {
        try {
            if (!this.contract) return;
            
            // Get total users
            const totalUsers = await this.contract.lastUserId();
            document.getElementById('totalUsers').textContent = totalUsers.toString();
            
        } catch (error) {
            console.error('Error loading contract stats:', error);
        }
    }
    
    async approveUSDT() {
        try {
            if (!this.usdtContract) {
                this.showAlert('Please connect your wallet first', 'warning');
                return;
            }
            
            this.showLoading('Approving USDT spending...');
            
            // Approve 100 USDT (with 6 decimals for USDT)
            const amount = ethers.utils.parseUnits('100', 6);
            const tx = await this.usdtContract.approve(this.contractAddress, amount);
            
            await tx.wait();
            
            // Enable register button
            document.getElementById('registerBtn').disabled = false;
            document.getElementById('approveUSDT').innerHTML = '<i class="fas fa-check me-2"></i>USDT Approved';
            document.getElementById('approveUSDT').classList.remove('btn-outline-primary');
            document.getElementById('approveUSDT').classList.add('btn-success');
            
            this.hideLoading();
            this.showAlert('USDT spending approved successfully!', 'success');
            
        } catch (error) {
            this.hideLoading();
            console.error('Error approving USDT:', error);
            this.showAlert('Failed to approve USDT spending. Please try again.', 'error');
        }
    }
    
    async register() {
        try {
            const sponsorCode = document.getElementById('sponsorCode').value.trim();
            
            if (!sponsorCode) {
                this.showAlert('Please enter a sponsor referral code', 'warning');
                return;
            }
            
            if (!this.contract) {
                this.showAlert('Please connect your wallet first', 'warning');
                return;
            }
            
            // Check if user already exists
            const userExists = await this.contract.isUserExists(this.userAccount);
            if (userExists) {
                this.showAlert('You are already registered!', 'info');
                return;
            }
            
            this.showLoading('Processing registration...');
            
            // Register user
            const tx = await this.contract.register(sponsorCode);
            await tx.wait();
            
            // Reload user data
            await this.loadUserData();
            await this.loadContractStats();
            
            this.hideLoading();
            this.showAlert('Registration successful! Welcome to the network!', 'success');
            
            // Reset form
            document.getElementById('registrationForm').reset();
            
        } catch (error) {
            this.hideLoading();
            console.error('Error during registration:', error);
            
            let errorMessage = 'Registration failed. Please try again.';
            if (error.message.includes('bad sponsor code')) {
                errorMessage = 'Invalid sponsor referral code. Please check and try again.';
            } else if (error.message.includes('already registered')) {
                errorMessage = 'You are already registered in the system.';
            } else if (error.message.includes('approve')) {
                errorMessage = 'Please approve USDT spending first.';
            }
            
            this.showAlert(errorMessage, 'error');
        }
    }
    
    showLoading(text = 'Processing...') {
        document.getElementById('loadingText').textContent = text;
        const modal = new bootstrap.Modal(document.getElementById('loadingModal'));
        modal.show();
    }
    
    hideLoading() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('loadingModal'));
        if (modal) {
            modal.hide();
        }
    }
    
    showAlert(message, type = 'info') {
        // Create alert element
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 100px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
    
    updateContractAddress() {
        document.getElementById('contractAddress').textContent = this.contractAddress;
    }
}

// Utility functions
function scrollToSection(sectionId) {
    document.getElementById(sectionId).scrollIntoView({ 
        behavior: 'smooth' 
    });
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MLMApp();
});

// Handle account changes
if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            location.reload();
        } else {
            location.reload();
        }
    });
    
    window.ethereum.on('chainChanged', () => {
        location.reload();
    });
}