import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, update, remove } from "firebase/database";
import { firebaseConfig } from './firebase-config.js';

// アプリケーションの状態を管理するオブジェクト
const app = {
    members: [],
    dinnerData: {},
    currentWeekStart: null,
    syncKey: null,
    database: null,
    syncRef: null,
    
    // アプリの初期化
    init: function() {
        // タブ切り替え機能の初期化
        this.initTabs();
        
        // ローカルストレージからデータを読み込む
        this.loadLocalData();
        
        // 現在の週の開始日を設定
        this.setCurrentWeek();
        
        // Firebase の初期化
        this.initFirebase();
        
        // イベントリスナーを設定
        this.setupEventListeners();
        
        // メンバーリストを更新
        this.updateMembersList();
        
        // 予定表を更新
        this.updateDinnerTable();
        
        // 同期キー情報を更新
        this.updateSyncKeyInfo();
    },
    
    // タブ切り替え機能の初期化 (前回と同じ)
    initTabs: function() {
        // ... (前回と同じ)
    },
    
    // ローカルストレージからデータを読み込む
    loadLocalData: function() {
        const savedMembers = localStorage.getItem('tapDinnerMembers');
        const savedDinnerData = localStorage.getItem('tapDinnerData');
        const savedSyncKey = localStorage.getItem('tapDinnerSyncKey');
        
        if (savedMembers) {
            this.members = JSON.parse(savedMembers);
        }
        
        if (savedDinnerData) {
            this.dinnerData = JSON.parse(savedDinnerData);
        }
        
        if (savedSyncKey) {
            this.syncKey = savedSyncKey;
        }
    },
    
    // ローカルデータを保存
    saveLocalData: function() {
        localStorage.setItem('tapDinnerMembers', JSON.stringify(this.members));
        localStorage.setItem('tapDinnerData', JSON.stringify(this.dinnerData));
        if (this.syncKey) {
            localStorage.setItem('tapDinnerSyncKey', this.syncKey);
        }
    },
    
    // Firebase の初期化
    initFirebase: function() {
        // Firebase の初期化
        const firebaseApp = initializeApp(firebaseConfig);
        this.database = getDatabase(firebaseApp);
        
        // 同期キーが設定されている場合は、データ同期を開始
        if (this.syncKey) {
            this.startSync();
        }
    },
    
    // データ同期を開始
    startSync: function() {
        if (!this.syncKey) return;
        
        // 安全なリファレンスキーに変換（無効な文字を除去）
        const safeKey = this.syncKey.replace(/[.#$/[\]]/g, '_');
        
        // Firebase のリファレンスを設定
        this.syncRef = ref(this.database, 'dinnerData/' + safeKey);
        
        // データ変更時のリスナーを設定
        onValue(this.syncRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Firebaseからのデータで上書き
                if (data.members) this.members = data.members;
                if (data.dinnerData) this.dinnerData = data.dinnerData;
                
                // ローカルデータを更新
                this.saveLocalData();
                
                // UI更新
                this.updateMembersList();
                this.updateDinnerTable();
                
                // 同期ステータスを更新
                document.getElementById('sync-status').textContent = '同期状態: 同期完了 (' + new Date().toLocaleTimeString() + ')';
            }
        });
        
        // 初回データをアップロード
        this.uploadData();
    },
    
    // Firebase にデータをアップロード
    uploadData: function() {
        if (!this.syncRef) return;
        
        set(this.syncRef, {
            members: this.members,
            dinnerData: this.dinnerData,
            lastUpdate: new Date().toISOString()
        });
    },
    
    // 同期キー情報を更新 (前回と同じ)
    updateSyncKeyInfo: function() {
        // ... (前回と同じ)
    },
    
    // 同期キーを設定
    setSyncKey: function(key) {
        if (!key.trim()) {
            alert('合言葉を入力してください');
            return;
        }
        
        // 以前の同期を停止
        if (this.syncRef) {
            // onValueのリスナーを解除する
        }
        
        this.syncKey = key.trim();
        this.saveLocalData();
        this.updateSyncKeyInfo();
        
        // 新しい同期を開始
        this.startSync();
    },
    
    // 現在の週の開始日（日曜日）を設定 (前回と同じ)
    setCurrentWeek: function(date = new Date()) {
        // ... (前回と同じ)
    },
    
    // メンバーリストを更新 (前回と同じ)
    updateMembersList: function() {
        // ... (前回と同じ)
    },
    
    // 予定表を更新 (前回と同じ)
    updateDinnerTable: function() {
        // ... (前回と同じ)
    },
    
    // 日付をフォーマット (YYYY-MM-DD) (前回と同じ)
    formatDate: function(date) {
        // ... (前回と同じ)
    },
    
    // メンバーを追加
    addMember: function() {
        const newMemberInput = document.getElementById('new-member');
        const name = newMemberInput.value.trim();
        
        if (!name) {
            alert('名前を入力してください');
            return;
        }
        
        // 同じ名前のメンバーがいないかチェック
        const exists = this.members.some(member => member.name === name);
        if (exists) {
            alert('その名前のメンバーは既に登録されています');
            return;
        }
        
        const newMember = {
            id: Date.now().toString(),
            name
        };
        
        this.members.push(newMember);
        this.saveLocalData();
        this.updateMembersList();
        this.updateDinnerTable();
        
        // データを同期
        if (this.syncRef) {
            this.uploadData();
        }
        
        // 入力をクリア
        newMemberInput.value = '';
    },
    
    // メンバーを削除
    deleteMember: function(memberId) {
        const confirmed = confirm('このメンバーを削除しますか？関連するすべての予定も削除されます。');
        if (!confirmed) return;
        
        // メンバーを削除
        this.members = this.members.filter(member => member.id !== memberId);
        
        // メンバーに関連する夕飯データも削除
        const newDinnerData = {};
        for (const key in this.dinnerData) {
            if (!key.startsWith(memberId + '_')) {
                newDinnerData[key] = this.dinnerData[key];
            }
        }
        
        this.dinnerData = newDinnerData;
        this.saveLocalData();
        this.updateMembersList();
        this.updateDinnerTable();
        
        // データを同期
        if (this.syncRef) {
            this.uploadData();
        }
    },
    
    // 前の週に移動 (前回と同じ)
    prevWeek: function() {
        // ... (前回と同じ)
    },
    
    // 次の週に移動 (前回と同じ)
    nextWeek: function() {
        // ... (前回と同じ)
    },
    
    // イベントリスナーのセットアップ (前回と同じ)
    setupEventListeners: function() {
        // ... (前回と同じ)
    }
};

// アプリケーションを初期化
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
    
    // 同期キー情報を更新
    updateSyncKeyInfo: function() {
        const display = document.getElementById('sync-key-display');
        const status = document.getElementById('sync-status');
        
        if (this.syncKey) {
            display.textContent = this.syncKey;
            status.textContent = '同期状態: 設定完了';
        } else {
            display.textContent = '未設定';
            status.textContent = '同期状態: 未設定';
        }
    },
    
    // 同期キーを設定
    setSyncKey: function(key) {
        if (!key.trim()) {
            alert('合言葉を入力してください');
            return;
        }
        
        // 以前の同期を停止
        if (this.syncRef) {
            // onValueのリスナーを解除する
        }
        
        this.syncKey = key.trim();
        this.saveLocalData();
        this.updateSyncKeyInfo();
        
        // 新しい同期を開始
        this.startSync();
    },
    
    // 現在の週の開始日（日曜日）を設定
    setCurrentWeek: function(date = new Date()) {
        const day = date.getDay(); // 0=日曜日, 1=月曜日, ...
        const diff = date.getDate() - day;
        this.currentWeekStart = new Date(date.setDate(diff));
        this.currentWeekStart.setHours(0, 0, 0, 0);
    },
    
    // メンバーリストを更新
    updateMembersList: function() {
        const membersList = document.getElementById('members-list');
        membersList.innerHTML = '';
        
        if (this.members.length === 0) {
            membersList.innerHTML = '<div class="empty-message">メンバーがいません。家族のメンバーを追加してください。</div>';
            return;
        }
        
        this.members.forEach(member => {
            const memberRow = document.createElement('div');
            memberRow.className = 'member-row';
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'member-name';
            nameSpan.textContent = member.name;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '削除';
            deleteBtn.className = 'delete-btn';
            deleteBtn.addEventListener('click', () => {
                this.deleteMember(member.id);
            });
            
            memberRow.appendChild(nameSpan);
            memberRow.appendChild(deleteBtn);
            membersList.appendChild(memberRow);
        });
    },
    
    // 予定表を更新
    updateDinnerTable: function() {
        const container = document.getElementById('dinner-table-container');
        container.innerHTML = '';
        
        if (this.members.length === 0) {
            container.innerHTML = '<div class="empty-message">メンバーがいません。「家族メンバー」タブからメンバーを追加してください。</div>';
            return;
        }
        
        // テーブルを作成
        const table = document.createElement('table');
        
        // ヘッダー行を作成
        const headerRow = document.createElement('tr');
        
        // 名前セルを作成
        const nameHeader = document.createElement('th');
        nameHeader.textContent = '名前';
        headerRow.appendChild(nameHeader);
        
        // 日付のヘッダーを作成
        const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(this.currentWeekStart);
            date.setDate(date.getDate() + i);
            
            const dayHeader = document.createElement('th');
            dayHeader.textContent = `${date.getMonth() + 1}/${date.getDate()}(${weekdays[i]})`;
            
            // 週末の背景色を変更
            if (i === 0 || i === 6) {
                dayHeader.classList.add('weekend');
            }
            
            // 今日の日付の場合、特別なスタイルを適用
            const today = new Date();
            if (date.toDateString() === today.toDateString()) {
                dayHeader.classList.add('today');
            }
            
            headerRow.appendChild(dayHeader);
        }
        
        table.appendChild(headerRow);
        
        // メンバーごとに行を作成
        this.members.forEach(member => {
            const row = document.createElement('tr');
            
            // 名前セル
            const nameCell = document.createElement('td');
            nameCell.textContent = member.name;
            nameCell.style.fontWeight = 'bold';
            row.appendChild(nameCell);
            
            // 各日付のセル
            for (let i = 0; i < 7; i++) {
                const date = new Date(this.currentWeekStart);
                date.setDate(date.getDate() + i);
                const dateStr = this.formatDate(date);
                
                const cell = document.createElement('td');
                cell.className = 'status-cell';
                
                // 週末の背景色を変更
                if (i === 0 || i === 6) {
                    cell.classList.add('weekend');
                }
                
                // 今日の日付の場合、特別なスタイルを適用
                const today = new Date();
                if (date.toDateString() === today.toDateString()) {
                    cell.classList.add('today');
                }
                
                // ステータスアイコン要素を作成
                const statusIcon = document.createElement('div');
                statusIcon.className = 'status-icon';
                cell.appendChild(statusIcon);
                
                // データキー
                const statusKey = `${member.id}_${dateStr}`;
                
                // 既存のステータスがあれば適用
                if (this.dinnerData[statusKey]) {
                    const status = this.dinnerData[statusKey];
                    cell.classList.add(`status-${status}`);
                }
                
                // クリックイベントを追加
                cell.addEventListener('click', () => {
                    // 現在のステータスを取得
                    let currentStatus = null;
                    if (cell.classList.contains('status-maru')) {
                        currentStatus = 'maru';
                    } else if (cell.classList.contains('status-batsu')) {
                        currentStatus = 'batsu';
                    } else if (cell.classList.contains('status-hatena')) {
                        currentStatus = 'hatena';
                    }
                    
                    // 次のステータスを決定
                    let nextStatus = null;
                    if (currentStatus === null) {
                        nextStatus = 'maru';
                    } else if (currentStatus === 'maru') {
                        nextStatus = 'batsu';
                    } else if (currentStatus === 'batsu') {
                        nextStatus = 'hatena';
                    } else if (currentStatus === 'hatena') {
                        nextStatus = null;
                    }
                    
                    // アニメーションのために一度クラスをリセットしてからアニメーションクラスを追加
                    cell.classList.remove('animate');
                    
                    // 現在のステータスクラスを削除
                    cell.classList.remove('status-maru', 'status-batsu', 'status-hatena');
                    
                    // 次のステータスがあれば設定
                    if (nextStatus) {
                        cell.classList.add(`status-${nextStatus}`);
                        
                        // データを更新
                        this.dinnerData[statusKey] = nextStatus;
                    } else {
                        // データを削除
                        delete this.dinnerData[statusKey];
                    }
                    
                    // アニメーションを追加
                    setTimeout(() => {
                        cell.classList.add('animate');
                    }, 10);
                    
                    // データを保存
                    this.saveLocalData();
                    
                    // データを同期
                    if (this.syncRef) {
                        this.uploadData();
                    }
                });
                
                row.appendChild(cell);
            }
            
            table.appendChild(row);
        });
        
        container.appendChild(table);
    },
    
    // 日付をフォーマット (YYYY-MM-DD)
    formatDate: function(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },
    
    // メンバーを追加
    addMember: function() {
        const newMemberInput = document.getElementById('new-member');
        const name = newMemberInput.value.trim();
        
        if (!name) {
            alert('名前を入力してください');
            return;
        }
        
        // 同じ名前のメンバーがいないかチェック
        const exists = this.members.some(member => member.name === name);
        if (exists) {
            alert('その名前のメンバーは既に登録されています');
            return;
        }
        
        const newMember = {
            id: Date.now().toString(),
            name
        };
        
        this.members.push(newMember);
        this.saveLocalData();
        this.updateMembersList();
        this.updateDinnerTable();
        
        // データを同期
        if (this.syncRef) {
            this.uploadData();
        }
        
        // 入力をクリア
        newMemberInput.value = '';
    },
    
    // メンバーを削除
    deleteMember: function(memberId) {
        const confirmed = confirm('このメンバーを削除しますか？関連するすべての予定も削除されます。');
        if (!confirmed) return;
        
        // メンバーを削除
        this.members = this.members.filter(member => member.id !== memberId);
        
        // メンバーに関連する夕飯データも削除
        const newDinnerData = {};
        for (const key in this.dinnerData) {
            if (!key.startsWith(memberId + '_')) {
                newDinnerData[key] = this.dinnerData[key];
            }
        }
        
        this.dinnerData = newDinnerData;
        this.saveLocalData();
        this.updateMembersList();
        this.updateDinnerTable();
        
        // データを同期
        if (this.syncRef) {
            this.uploadData();
        }
    },
    
    // 前の週に移動
    prevWeek: function() {
        const date = new Date(this.currentWeekStart);
        date.setDate(date.getDate() - 7);
        this.setCurrentWeek(date);
        this.updateDinnerTable();
    },
    
    // 次の週に移動
    nextWeek: function() {
        const date = new Date(this.currentWeekStart);
        date.setDate(date.getDate() + 7);
        this.setCurrentWeek(date);
        this.updateDinnerTable();
    },
    
    // イベントリスナーのセットアップ
    setupEventListeners: function() {
        // メンバーを追加するボタン
        document.getElementById('add-member-btn').addEventListener('click', () => {
            this.addMember();
        });
        
        // Enter キーでもメンバー追加
        document.getElementById('new-member').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addMember();
            }
        });
        
        // 週の移動ボタン
        document.getElementById('prev-week').addEventListener('click', () => {
            this.prevWeek();
        });
        
        document.getElementById('next-week').addEventListener('click', () => {
            this.nextWeek();
        });
        
        // 同期キー設定ボタン
        document.getElementById('set-sync-key').addEventListener('click', () => {
            const key = document.getElementById('sync-key').value;
            this.setSyncKey(key);
        });
        
        // Enter キーでも同期キー設定
        document.getElementById('sync-key').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const key = document.getElementById('sync-key').value;
                this.setSyncKey(key);
            }
        });
    }
};

// アプリケーションを初期化
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
