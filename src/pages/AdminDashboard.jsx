import React, { useState, useEffect } from "react"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import ExpenseTable from "@/components/ExpenseTable"
import AdminPasswordGate from "@/components/AdminPasswordGate"
import AuditTrail from "@/components/AuditTrail"
import { supabase, isSupabaseConfigured } from "@/supabaseClient"
import { fetchCategories, addCategory, deleteCategory } from "@/lib/categoriesService"
import { fetchExpenses, deleteExpense } from "@/lib/expensesService"
import { exportExpensesToPDF } from "@/lib/pdfExport"
import { backupTransactionToGoogle } from "@/lib/googleBackupService"
import { fetchFunds, addFund, updateFund, deleteFund as deleteFundEntry, uploadFundBill } from "@/lib/fundsService"
import {
  fetchInvestments,
  addInvestment,
  updateInvestment,
  deleteInvestment as deleteInvestmentEntry,
  uploadInvestmentBill
} from "@/lib/investmentsService"
import { formatINR } from "@/lib/utils"
import {
  PlusCircle,
  CheckCircle,
  AlertTriangle,
  FolderPlus,
  Trash2,
  Tag,
  AlertCircle,
  Wallet,
  Pencil,
  Rocket,
  ShieldCheck,
  History,
  RefreshCw,
  TrendingDown
} from "lucide-react"
import { Input, Label, Textarea, Select } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter
} from "@/components/ui/dialog"

const PRESET_COLORS = [
  { label: "Navy", value: "#0B2149" },
  { label: "Gold", value: "#D4AF37" },
  { label: "Teal", value: "#0D9488" },
  { label: "Red", value: "#DC2626" },
  { label: "Purple", value: "#7C3AED" },
  { label: "Gray", value: "#475569" }
]

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  const [expenses, setExpenses] = useState([])
  const [categoriesList, setCategoriesList] = useState([])
  const [loading, setLoading] = useState(true)
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("expenses") // "expenses" | "categories" | "funds"

  // Trust layer: a real "last updated" time and honest per-source load errors,
  // so a failed fetch can never masquerade as ₹0 money.
  const [lastSyncedAt, setLastSyncedAt] = useState(null)
  const [syncErrors, setSyncErrors] = useState({ expenses: null, funds: null, investments: null })

  // Funds state
  const [funds, setFunds] = useState([])
  const [fundsLoading, setFundsLoading] = useState(true)
  const [fundSubmitting, setFundSubmitting] = useState(false)
  const [fundToDelete, setFundToDelete] = useState(null)

  // Fund Form State
  const [fundDate, setFundDate] = useState(() => {
    const today = new Date()
    return today.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    })
  })
  const [fundAmount, setFundAmount] = useState("")
  const [fundNote, setFundNote] = useState("")
  const [fundFile, setFundFile] = useState(null)

  // Edit Expense Modal State
  const [editingExpense, setEditingExpense] = useState(null)
  const [editExpDate, setEditExpDate] = useState("")
  const [editExpDescription, setEditExpDescription] = useState("")
  const [editExpCategory, setEditExpCategory] = useState("")
  const [editExpAmount, setEditExpAmount] = useState("")
  const [editExpNotes, setEditExpNotes] = useState("")
  const [editExpFile, setEditExpFile] = useState(null)
  const [savingExpenseEdit, setSavingExpenseEdit] = useState(false)

  // Edit Fund Modal State
  const [editingFund, setEditingFund] = useState(null)
  const [editFundDate, setEditFundDate] = useState("")
  const [editFundAmount, setEditFundAmount] = useState("")
  const [editFundNote, setEditFundNote] = useState("")
  const [editFundFile, setEditFundFile] = useState(null)
  const [savingFundEdit, setSavingFundEdit] = useState(false)

  // Investments state
  const [investments, setInvestments] = useState([])
  const [investmentsLoading, setInvestmentsLoading] = useState(true)
  const [investmentSubmitting, setInvestmentSubmitting] = useState(false)
  const [investmentToDelete, setInvestmentToDelete] = useState(null)

  // Investment Form State
  const [investmentDate, setInvestmentDate] = useState(() => {
    const today = new Date()
    return today.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    })
  })
  const [investmentAmount, setInvestmentAmount] = useState("")
  const [investmentNote, setInvestmentNote] = useState("")
  const [investmentFile, setInvestmentFile] = useState(null)

  // Edit Investment Modal State
  const [editingInvestment, setEditingInvestment] = useState(null)
  const [editInvestmentDate, setEditInvestmentDate] = useState("")
  const [editInvestmentAmount, setEditInvestmentAmount] = useState("")
  const [editInvestmentNote, setEditInvestmentNote] = useState("")
  const [editInvestmentFile, setEditInvestmentFile] = useState(null)
  const [savingInvestmentEdit, setSavingInvestmentEdit] = useState(false)

  // Category Modal State
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryColor, setNewCategoryColor] = useState("#0B2149")
  const [savingCategory, setSavingCategory] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState(null) // for confirmation dialog

  // Form State
  const [date, setDate] = useState(() => {
    const today = new Date()
    return today.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    })
  })
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("Hosting")
  const [amount, setAmount] = useState("")
  const [notes, setNotes] = useState("")
  const [file, setFile] = useState(null)

  // Marks a source as successfully synced and records the real "last updated" time
  const markSynced = (key) => {
    setSyncErrors((prev) => ({ ...prev, [key]: null }))
    setLastSyncedAt(new Date())
  }

  // Records a failed source WITHOUT wiping what is already on screen
  const markSyncFailed = (key, message) => {
    setSyncErrors((prev) => ({ ...prev, [key]: message || "Failed to load" }))
  }

  // Fetch expenses — a failure is reported honestly, never as ₹0 or demo data
  const loadExpenses = async () => {
    setLoading(true)
    try {
      const data = await fetchExpenses()
      setExpenses(data || [])
      markSynced("expenses")
    } catch (err) {
      console.error("Fetch expenses error:", err)
      markSyncFailed("expenses", err.message)
    } finally {
      setLoading(false)
    }
  }

  // Fetch categories from Supabase / seed defaults
  const loadCategories = async () => {
    setCategoriesLoading(true)
    try {
      const cats = await fetchCategories()
      setCategoriesList(cats)
      if (cats.length > 0 && !category) {
        setCategory(cats[0].name)
      }
    } catch (err) {
      console.warn("Failed to load categories:", err)
    } finally {
      setCategoriesLoading(false)
    }
  }

  // Fetch funds
  const loadFunds = async () => {
    setFundsLoading(true)
    try {
      const data = await fetchFunds()
      setFunds(data || [])
      markSynced("funds")
    } catch (err) {
      console.warn("Failed to load funds:", err)
      markSyncFailed("funds", err.message)
    } finally {
      setFundsLoading(false)
    }
  }

  // Fetch investments
  const loadInvestments = async () => {
    setInvestmentsLoading(true)
    try {
      const data = await fetchInvestments()
      setInvestments(data || [])
      markSynced("investments")
    } catch (err) {
      console.warn("Failed to load investments:", err)
      markSyncFailed("investments", err.message)
    } finally {
      setInvestmentsLoading(false)
    }
  }

  // Restore / watch the real Supabase auth session (writes are authorized by it)
  useEffect(() => {
    let active = true

    if (!(isSupabaseConfigured && supabase)) {
      setAuthChecking(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setIsAuthenticated(Boolean(data?.session))
      setAuthChecking(false)
    })

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session))
    })

    return () => {
      active = false
      authSub?.subscription?.unsubscribe?.()
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      loadExpenses()
      loadCategories()
      loadFunds()
      loadInvestments()
    }
    // Runs once per sign-in; the loaders are recreated on every render.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const handleLogout = async () => {
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut()
      }
    } catch (err) {
      console.warn("Sign out error:", err)
    }
    sessionStorage.removeItem("admin_authed") // clear legacy flag
    setIsAuthenticated(false)
  }

  // Keep selected category valid when categories change
  useEffect(() => {
    if (categoriesList.length > 0) {
      const exists = categoriesList.some((c) => c.name === category)
      if (!exists) {
        setCategory(categoriesList[0].name)
      }
    } else {
      setCategory("")
    }
    // Only re-validate when the category list itself changes.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriesList])

  // Create Category Handler
  const handleCreateCategory = async (e) => {
    e.preventDefault()
    if (!newCategoryName.trim()) return

    setSavingCategory(true)
    try {
      await addCategory(newCategoryName, newCategoryColor)
      await loadCategories()
      setStatusMessage({ type: "success", text: `Category "${newCategoryName.trim()}" created successfully.` })
      setNewCategoryName("")
      setNewCategoryColor("#0B2149")
      setIsAddCategoryOpen(false)
    } catch (err) {
      setStatusMessage({ type: "error", text: `Failed to create category: ${err.message}` })
    } finally {
      setSavingCategory(false)
    }
  }

  // Delete Category Handler
  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return
    try {
      await deleteCategory(categoryToDelete.id, categoryToDelete.name)
      await loadCategories()
      setStatusMessage({
        type: "success",
        text: `Category "${categoryToDelete.name}" deleted. Existing expenses retain this label.`
      })
    } catch (err) {
      setStatusMessage({ type: "error", text: `Failed to delete category: ${err.message}` })
    } finally {
      setCategoryToDelete(null)
    }
  }

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!description || !amount) {
      setStatusMessage({ type: "error", text: "Please enter a description and amount." })
      return
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setStatusMessage({ type: "error", text: "Amount must be a positive number greater than 0." })
      return
    }

    setSubmitting(true)
    setStatusMessage(null)

    try {
      let uploadedBillUrl = null

      if (isSupabaseConfigured && supabase) {
        if (file) {
          const fileExt = file.name.split(".").pop()
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
          const filePath = `${fileName}`

          const { error: uploadError } = await supabase.storage
            .from("bills")
            .upload(filePath, file)

          if (uploadError) {
            console.error("Storage upload error:", uploadError)
            throw new Error(`File upload failed: ${uploadError.message}`)
          }

          const { data: publicUrlData } = supabase.storage
            .from("bills")
            .getPublicUrl(filePath)

          uploadedBillUrl = publicUrlData?.publicUrl || null
        }

        const { data: insertedData, error: insertError } = await supabase
          .from("expenses")
          .insert([
            {
              date,
              description,
              category,
              amount: parseFloat(amount),
              notes,
              bill_url: uploadedBillUrl
            }
          ])
          .select()

        if (insertError) {
          throw new Error(`Database insert error: ${insertError.message}`)
        }

        const insertedRecord = insertedData?.[0] || {
          date,
          description,
          category,
          amount: parseFloat(amount),
          notes,
          bill_url: uploadedBillUrl
        }

        // Automatic Google Drive / Sheets backup in background
        backupTransactionToGoogle(insertedRecord).catch((backupErr) => {
          console.warn("Background Google backup error:", backupErr)
        })

        setStatusMessage({ type: "success", text: "Expense recorded & bill stored successfully in Supabase." })
        await loadExpenses()
      } else {
        let mockBillUrl = null
        if (file) {
          mockBillUrl = URL.createObjectURL(file)
        } else {
          mockBillUrl = "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80"
        }

        const newRecord = {
          id: Date.now(),
          date,
          description,
          category,
          amount: parseFloat(amount),
          notes,
          bill_url: mockBillUrl
        }

        const updated = [newRecord, ...expenses]
        setExpenses(updated)
        localStorage.setItem("bjr_admin_expenses", JSON.stringify(updated))
        setStatusMessage({
          type: "success",
          text: "Recorded locally."
        })
      }

      setDescription("")
      setAmount("")
      setNotes("")
      setFile(null)
      const fileInput = document.getElementById("bill-upload")
      if (fileInput) fileInput.value = ""
    } catch (err) {
      console.error("Add expense error:", err)
      setStatusMessage({ type: "error", text: err.message || "Failed to add expense." })
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Delete — soft delete: the row leaves the ledger but stays
  // recoverable in the Activity tab and in the audit trail.
  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Move this expense to Recently Deleted?\n\nIt disappears from the ledger and the client view, but stays in the audit trail and can be restored from the Activity tab."
    )
    if (!confirmed) return

    try {
      await deleteExpense(id)
      setExpenses((prev) => prev.filter((item) => item.id !== id))
      setStatusMessage({
        type: "success",
        text: "Expense removed from the ledger — audit trail kept. You can restore it from the Activity tab."
      })
    } catch (err) {
      console.error(err)
      setStatusMessage({ type: "error", text: `Failed to delete record: ${err.message}` })
    }
  }

  // Handle Fund Submission (client handed over money)
  const handleFundSubmit = async (e) => {
    e.preventDefault()
    if (!fundAmount) {
      setStatusMessage({ type: "error", text: "Please enter the amount received." })
      return
    }

    const numAmount = parseFloat(fundAmount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setStatusMessage({ type: "error", text: "Amount must be a positive number greater than 0." })
      return
    }

    setFundSubmitting(true)
    setStatusMessage(null)

    try {
      // Upload receipt to the shared `bills` storage bucket first (if provided)
      let uploadedBillUrl = null
      if (fundFile) {
        uploadedBillUrl = await uploadFundBill(fundFile)
      }

      const newFund = await addFund({ date: fundDate, amount: numAmount, note: fundNote, bill_url: uploadedBillUrl })
      setFunds((prev) => [newFund, ...prev])

      // Background Google backup (tagged as a fund so the sheet can route it)
      backupTransactionToGoogle({ ...newFund, type: "fund" }).catch((backupErr) => {
        console.warn("Background Google backup error (fund):", backupErr)
      })

      setStatusMessage({ type: "success", text: `Funds of ${formatINR(numAmount)} recorded successfully.${uploadedBillUrl ? " Receipt stored." : ""}` })
      setFundAmount("")
      setFundNote("")
      setFundFile(null)
      const fundFileInput = document.getElementById("fund-bill-upload")
      if (fundFileInput) fundFileInput.value = ""
    } catch (err) {
      setStatusMessage({ type: "error", text: err.message || "Failed to record funds." })
    } finally {
      setFundSubmitting(false)
    }
  }

  // Handle Fund Delete
  const handleConfirmDeleteFund = async () => {
    if (!fundToDelete) return
    try {
      await deleteFundEntry(fundToDelete.id)
      setFunds((prev) => prev.filter((f) => f.id !== fundToDelete.id))
      setStatusMessage({ type: "success", text: "Fund entry deleted successfully." })
    } catch (err) {
      setStatusMessage({ type: "error", text: err.message || "Failed to delete fund entry." })
    } finally {
      setFundToDelete(null)
    }
  }

  // ---- Edit Expense (attach/replace receipt later works too) ----
  const openEditExpense = (expense) => {
    setEditingExpense(expense)
    setEditExpDate(expense.date || "")
    setEditExpDescription(expense.description || "")
    setEditExpCategory(expense.category || "")
    setEditExpAmount(String(expense.amount ?? ""))
    setEditExpNotes(expense.notes || "")
    setEditExpFile(null)
    setStatusMessage(null)
  }

  const handleEditExpenseSave = async (e) => {
    e.preventDefault()
    if (!editingExpense) return
    if (!editExpDescription || !editExpAmount) {
      setStatusMessage({ type: "error", text: "Description and amount are required." })
      return
    }

    const numAmount = parseFloat(editExpAmount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setStatusMessage({ type: "error", text: "Amount must be a positive number greater than 0." })
      return
    }

    setSavingExpenseEdit(true)
    try {
      let updatedData = {
        date: editExpDate,
        description: editExpDescription,
        category: editExpCategory,
        amount: numAmount,
        notes: editExpNotes
      }

      // Upload a new receipt if one was picked (attach or replace)
      if (editExpFile) {
        const fileExt = editExpFile.name.split(".").pop()
        const fileName = `expense-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`

        if (isSupabaseConfigured && supabase) {
          const { error: uploadError } = await supabase.storage
            .from("bills")
            .upload(fileName, editExpFile)
          if (uploadError) throw new Error(`File upload failed: ${uploadError.message}`)

          const { data: publicUrlData } = supabase.storage
            .from("bills")
            .getPublicUrl(fileName)
          updatedData.bill_url = publicUrlData?.publicUrl || null
        } else {
          updatedData.bill_url = URL.createObjectURL(editExpFile)
        }

        // clear the file input for next time
        const fileInput = document.getElementById("edit-expense-bill-upload")
        if (fileInput) fileInput.value = ""
      }

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from("expenses")
          .update(updatedData)
          .eq("id", editingExpense.id)
          .select()

        if (error) throw new Error(`Database update error: ${error.message}`)
        const updatedRow = data?.[0] || { ...editingExpense, ...updatedData }

        backupTransactionToGoogle({ ...updatedRow, type: "expense_update" }).catch((backupErr) => {
          console.warn("Background Google backup error (expense update):", backupErr)
        })

        setExpenses((prev) => prev.map((row) => (row.id === updatedRow.id ? updatedRow : row)))
      } else {
        const updatedRow = { ...editingExpense, ...updatedData }
        const updated = expenses.map((row) => (row.id === updatedRow.id ? updatedRow : row))
        setExpenses(updated)
        localStorage.setItem("bjr_admin_expenses", JSON.stringify(updated))
      }

      setStatusMessage({ type: "success", text: "Expense updated successfully." })
      setEditingExpense(null)
    } catch (err) {
      setStatusMessage({ type: "error", text: err.message || "Failed to update expense." })
    } finally {
      setSavingExpenseEdit(false)
    }
  }

  // ---- Edit Fund (attach/replace receipt later works too) ----
  const openEditFund = (fund) => {
    setEditingFund(fund)
    setEditFundDate(fund.date || "")
    setEditFundAmount(String(fund.amount ?? ""))
    setEditFundNote(fund.note || "")
    setEditFundFile(null)
    setStatusMessage(null)
  }

  const handleEditFundSave = async (e) => {
    e.preventDefault()
    if (!editingFund) return
    if (!editFundAmount) {
      setStatusMessage({ type: "error", text: "Amount is required." })
      return
    }

    const numAmount = parseFloat(editFundAmount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setStatusMessage({ type: "error", text: "Amount must be a positive number greater than 0." })
      return
    }

    setSavingFundEdit(true)
    try {
      const updates = {
        date: editFundDate,
        amount: numAmount,
        note: editFundNote
      }

      // Attach or replace the receipt
      if (editFundFile) {
        updates.bill_url = await uploadFundBill(editFundFile)
        const fundFileInput = document.getElementById("edit-fund-bill-upload")
        if (fundFileInput) fundFileInput.value = ""
      }

      const updatedRow = await updateFund(editingFund.id, updates)

      backupTransactionToGoogle({ ...(updatedRow || { ...editingFund, ...updates }), type: "fund_update" }).catch((backupErr) => {
        console.warn("Background Google backup error (fund update):", backupErr)
      })

      setFunds((prev) =>
        prev.map((f) => (f.id === editingFund.id ? { ...f, ...(updatedRow || updates) } : f))
      )
      setStatusMessage({ type: "success", text: "Fund entry updated successfully." })
      setEditingFund(null)
    } catch (err) {
      setStatusMessage({ type: "error", text: err.message || "Failed to update fund entry." })
    } finally {
      setSavingFundEdit(false)
    }
  }

  // ---- Investments (money poured into the startup by the investor) ----
  const handleInvestmentSubmit = async (e) => {
    e.preventDefault()
    if (!investmentAmount) {
      setStatusMessage({ type: "error", text: "Please enter the invested amount." })
      return
    }

    const numAmount = parseFloat(investmentAmount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setStatusMessage({ type: "error", text: "Amount must be a positive number greater than 0." })
      return
    }

    setInvestmentSubmitting(true)
    setStatusMessage(null)

    try {
      let uploadedBillUrl = null
      if (investmentFile) {
        uploadedBillUrl = await uploadInvestmentBill(investmentFile)
      }

      const newInvestment = await addInvestment({
        date: investmentDate,
        amount: numAmount,
        note: investmentNote,
        bill_url: uploadedBillUrl
      })
      setInvestments((prev) => [newInvestment, ...prev])

      // Background Google backup (tagged as investment so the sheet can route it)
      backupTransactionToGoogle({ ...newInvestment, type: "investment" }).catch((backupErr) => {
        console.warn("Background Google backup error (investment):", backupErr)
      })

      setStatusMessage({
        type: "success",
        text: `Investment of ${formatINR(numAmount)} recorded successfully.${uploadedBillUrl ? " Receipt stored." : ""}`
      })
      setInvestmentAmount("")
      setInvestmentNote("")
      setInvestmentFile(null)
      const invFileInput = document.getElementById("investment-bill-upload")
      if (invFileInput) invFileInput.value = ""
    } catch (err) {
      setStatusMessage({ type: "error", text: err.message || "Failed to record investment." })
    } finally {
      setInvestmentSubmitting(false)
    }
  }

  const openEditInvestment = (investment) => {
    setEditingInvestment(investment)
    setEditInvestmentDate(investment.date || "")
    setEditInvestmentAmount(String(investment.amount ?? ""))
    setEditInvestmentNote(investment.note || "")
    setEditInvestmentFile(null)
    setStatusMessage(null)
  }

  const handleEditInvestmentSave = async (e) => {
    e.preventDefault()
    if (!editingInvestment) return
    if (!editInvestmentAmount) {
      setStatusMessage({ type: "error", text: "Amount is required." })
      return
    }

    const numAmount = parseFloat(editInvestmentAmount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setStatusMessage({ type: "error", text: "Amount must be a positive number greater than 0." })
      return
    }

    setSavingInvestmentEdit(true)
    try {
      const updates = {
        date: editInvestmentDate,
        amount: numAmount,
        note: editInvestmentNote
      }

      // Attach or replace the receipt
      if (editInvestmentFile) {
        updates.bill_url = await uploadInvestmentBill(editInvestmentFile)
        const invFileInput = document.getElementById("edit-investment-bill-upload")
        if (invFileInput) invFileInput.value = ""
      }

      const updatedRow = await updateInvestment(editingInvestment.id, updates)

      backupTransactionToGoogle({ ...(updatedRow || { ...editingInvestment, ...updates }), type: "investment_update" }).catch((backupErr) => {
        console.warn("Background Google backup error (investment update):", backupErr)
      })

      setInvestments((prev) =>
        prev.map((inv) => (inv.id === editingInvestment.id ? { ...inv, ...(updatedRow || updates) } : inv))
      )
      setStatusMessage({ type: "success", text: "Investment updated successfully." })
      setEditingInvestment(null)
    } catch (err) {
      setStatusMessage({ type: "error", text: err.message || "Failed to update investment." })
    } finally {
      setSavingInvestmentEdit(false)
    }
  }

  const handleConfirmDeleteInvestment = async () => {
    if (!investmentToDelete) return
    try {
      await deleteInvestmentEntry(investmentToDelete.id)
      setInvestments((prev) => prev.filter((inv) => inv.id !== investmentToDelete.id))
      setStatusMessage({ type: "success", text: "Investment entry deleted successfully." })
    } catch (err) {
      setStatusMessage({ type: "error", text: err.message || "Failed to delete investment entry." })
    } finally {
      setInvestmentToDelete(null)
    }
  }

  // Filter
  const filteredExpenses = expenses.filter((item) => {
    const matchesCategory =
      selectedCategory === "all" ||
      (item.category || "").toLowerCase() === selectedCategory.toLowerCase()

    const search = searchTerm.toLowerCase().trim()
    const matchesSearch =
      !search ||
      (item.description || "").toLowerCase().includes(search) ||
      (item.notes || "").toLowerCase().includes(search) ||
      (item.date || "").toLowerCase().includes(search) ||
      String(item.amount || "").includes(search)

    return matchesCategory && matchesSearch
  })

  const totalSpent = filteredExpenses.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  )

  // Balance math: money given by client minus everything spent
  const totalFunds = funds.reduce((sum, f) => sum + (Number(f.amount) || 0), 0)
  const balance = totalFunds - totalSpent
  const isLowBalance = balance <= 0

  // Investment math: every expense is capital deployed into the project (automatic),
  // plus directly-uploaded non-expense investments from the admin panel
  const investmentEntriesTotal = investments.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0)
  const totalInvested = totalSpent + investmentEntriesTotal

  // Direct investments, shaped for the Audit PDF (itemized separately from expenses)
  const directInvestmentRows = React.useMemo(
    () =>
      investments
        .map((inv) => ({
          date: inv.date,
          description: inv.note || "Startup Investment (Direct Funding)",
          amount: Number(inv.amount) || 0
        }))
        .sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0)),
    [investments]
  )

  const handleDownloadPDF = () => {
    exportExpensesToPDF(filteredExpenses, "BJR Admin Audit", {
      totalFunds,
      balance,
      totalInvested,
      investments: directInvestmentRows
    })
  }

  // Honest sync state: what failed to load, and whether we even have figures to show
  const syncErrorList = Object.entries(syncErrors).filter(([, message]) => Boolean(message))
  const hasSyncIssue = syncErrorList.length > 0
  const fundsUnavailable = Boolean(syncErrors.funds) && funds.length === 0
  const spentUnavailable = Boolean(syncErrors.expenses) && expenses.length === 0
  const investedUnavailable =
    (Boolean(syncErrors.investments) && investments.length === 0) || spentUnavailable

  const retrySync = () => {
    loadExpenses()
    loadFunds()
    loadInvestments()
  }

  // Never render a false ₹0: show a dash when a figure simply failed to load
  const showFigure = (value, unavailable) => (unavailable ? "—" : formatINR(value))

  const categoryNames = categoriesList.map((c) => c.name)

  const categoryColorMap = React.useMemo(() => {
    const map = {}
    categoriesList.forEach((c) => {
      if (c.name && c.color) {
        map[c.name] = c.color
        map[c.name.toLowerCase()] = c.color
      }
    })
    return map
  }, [categoriesList])

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-xs text-gray-500 font-medium">Verifying admin session...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <AdminPasswordGate onAuthenticated={() => setIsAuthenticated(true)} />
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row text-gray-900">
      {/* Sidebar */}
      <Sidebar
        totalSpent={totalSpent}
        balance={balance}
        transactionCount={filteredExpenses.length}
        onDownloadReport={handleDownloadPDF}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <Header
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          categories={categoryNames}
          onToggleSidebar={() => setIsSidebarOpen(true)}
          onLogout={handleLogout}
          lastUpdated={lastSyncedAt}
          hasSyncIssue={hasSyncIssue}
        />

        <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
          {/* Status Alert */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-md text-[13px] font-medium flex items-center gap-2 border ${
                statusMessage.type === "success"
                  ? "bg-white text-emerald-800 border-emerald-300"
                  : "bg-white text-red-800 border-red-300"
              }`}
            >
              {statusMessage.type === "success" ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* HONEST SYNC WARNING — a failed load must never look like ₹0 */}
          {hasSyncIssue && (
            <div className="p-3.5 rounded-md text-[13px] font-medium flex flex-col sm:flex-row sm:items-center gap-2 border bg-white text-amber-900 border-amber-300">
              <div className="flex items-start gap-2 flex-1">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Couldn&apos;t load live data for {syncErrorList.map(([key]) => key).join(", ")}.
                  {lastSyncedAt
                    ? " The figures shown are the last values that loaded successfully."
                    : " No figures are shown until this succeeds."}
                </span>
              </div>
              <button
                type="button"
                onClick={retrySync}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-300 rounded-md hover:bg-amber-100 shrink-0 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          )}

          {/* TOP BALANCE STRIP (visible on all tabs) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                <Wallet className="w-3.5 h-3.5" />
                <span>Funds Received</span>
              </div>
              <span className="block mt-1 text-xl font-bold font-mono tabular-nums text-navy">
                {showFigure(totalFunds, fundsUnavailable)}
              </span>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                <TrendingDown className="w-3.5 h-3.5" />
                <span>Total Spent</span>
              </div>
              <span className="block mt-1 text-xl font-bold font-mono tabular-nums text-navy">
                {showFigure(totalSpent, spentUnavailable)}
              </span>
            </div>
            <div className={`rounded-lg border px-4 py-3 ${fundsUnavailable || spentUnavailable ? "border-gray-300 bg-gray-50" : isLowBalance ? "border-red-300 bg-red-50" : "border-emerald-300 bg-emerald-50"}`}>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                {fundsUnavailable || spentUnavailable ? "Balance unavailable" : isLowBalance ? "⚠ Low Balance" : "Available Balance"}
              </div>
              <span className={`block mt-1 text-xl font-bold font-mono tabular-nums ${fundsUnavailable || spentUnavailable ? "text-gray-400" : isLowBalance ? "text-red-600" : "text-emerald-700"}`}>
                {showFigure(balance, fundsUnavailable || spentUnavailable)}
              </span>
            </div>
            <div className="rounded-lg border border-[#D4AF37]/50 bg-gradient-to-br from-[#0B2149] to-[#123168] px-4 py-3 text-white">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#D4AF37]">
                <Rocket className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Total Invested</span>
              </div>
              <span className="block mt-1 text-xl font-bold font-mono tabular-nums text-white">
                {showFigure(totalInvested, investedUnavailable)}
              </span>
            </div>
          </div>

          {/* Top Admin Section Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
            <button
              type="button"
              onClick={() => setActiveTab("expenses")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                activeTab === "expenses"
                  ? "bg-navy text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Log Expense & Ledger</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("funds")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                activeTab === "funds"
                  ? "bg-navy text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Funds Received ({funds.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("investments")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                activeTab === "investments"
                  ? "bg-navy text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>Investments ({investments.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("categories")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                activeTab === "categories"
                  ? "bg-navy text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Manage Categories ({categoriesList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("audit")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                activeTab === "audit"
                  ? "bg-navy text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Activity &amp; Audit Trail</span>
            </button>
          </div>

          {activeTab === "audit" ? (
            <AuditTrail
              onRestored={() => {
                loadExpenses()
                loadFunds()
                loadInvestments()
              }}
              expenses={expenses}
              funds={funds}
              investments={investments}
            />
          ) : activeTab === "categories" ? (
            /* 2. ADMIN DASHBOARD — CATEGORY MANAGEMENT SECTION */
            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-[15px] font-semibold text-gray-900 tracking-tight">
                    Custom Categories
                  </h2>
                  <p className="text-[13px] text-gray-500 mt-0.5">
                    Define custom expenditure categories and badge colors for your client ledger
                  </p>
                </div>
                <Button
                  onClick={() => setIsAddCategoryOpen(true)}
                  className="bg-navy hover:bg-navy-dark text-white text-xs font-semibold h-8.5 px-3.5"
                >
                  <FolderPlus className="w-3.5 h-3.5 mr-1.5" />
                  Add New Category
                </Button>
              </div>

              <div className="p-6">
                {categoriesLoading ? (
                  <div className="text-center py-8 text-xs text-gray-500">
                    Loading categories...
                  </div>
                ) : categoriesList.length === 0 ? (
                  <div className="text-center py-8 text-xs text-gray-500">
                    No categories created yet. Click "Add New Category" above.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {categoriesList.map((catItem) => (
                      <div
                        key={catItem.id || catItem.name}
                        className="flex items-center justify-between p-3 rounded-md border border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Colored dot indicator */}
                          <span
                            className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                            style={{ backgroundColor: catItem.color || "#0B2149" }}
                          />
                          <span className="text-[13px] font-semibold text-gray-900 truncate">
                            {catItem.name}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setCategoryToDelete(catItem)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors cursor-pointer rounded"
                          title={`Delete ${catItem.name}`}
                          aria-label={`Delete ${catItem.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === "investments" ? (
            /* 4. ADMIN DASHBOARD — INVESTMENTS SECTION */
            <>
              {/* PROJECT CAPITAL OVERVIEW — Investments + Expenses & Overall Funds spent on the project */}
              <div className="rounded-lg border border-gray-200 bg-white">
                <div className="border-b border-gray-200 px-6 py-4 flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-[#D4AF37]" />
                  <div>
                    <h2 className="text-[15px] font-semibold text-gray-900 tracking-tight">
                      Project Capital Overview
                    </h2>
                    <p className="text-[13px] text-gray-500 mt-0.5">
                      Investments &amp; overall funds — expenses and everything spent on the project, at a glance
                    </p>
                  </div>
                </div>

                <div className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Total Invested (gold headline) — every expense auto-counts, plus direct uploads */}
                  <div className="rounded-lg border border-[#D4AF37]/50 bg-gradient-to-br from-[#0B2149] to-[#123168] px-4 py-3.5 text-white">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#D4AF37]">
                      <Rocket className="w-3.5 h-3.5" />
                      <span>Total Invested</span>
                    </div>
                    <span className="block mt-1.5 text-xl font-bold font-mono tabular-nums text-white">
                      {formatINR(totalInvested)}
                    </span>
                    <span className="block mt-0.5 text-[11px] text-gray-300">
                      Expenses auto-tracked {formatINR(totalSpent)} + uploads {formatINR(investmentEntriesTotal)}
                    </span>
                  </div>

                  {/* Funds Received */}
                  <div className="rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-3.5">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                      Funds Received
                    </div>
                    <span className="block mt-1.5 text-xl font-bold font-mono tabular-nums text-navy">
                      {formatINR(totalFunds)}
                    </span>
                    <span className="block mt-0.5 text-[11px] text-gray-400">
                      Working money you hold
                    </span>
                  </div>

                  {/* Total Spent */}
                  <div className="rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-3.5">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                      Total Spent
                    </div>
                    <span className="block mt-1.5 text-xl font-bold font-mono tabular-nums text-navy">
                      {formatINR(totalSpent)}
                    </span>
                    <span className="block mt-0.5 text-[11px] text-gray-400">
                      Expenses + overall project spend
                    </span>
                  </div>

                  {/* Available Balance */}
                  <div className={`rounded-lg border px-4 py-3.5 ${isLowBalance ? "border-red-300 bg-red-50" : "border-emerald-300 bg-emerald-50"}`}>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                      {isLowBalance ? "⚠ Low Balance" : "Available Balance"}
                    </div>
                    <span className={`block mt-1.5 text-xl font-bold font-mono tabular-nums ${isLowBalance ? "text-red-600" : "text-emerald-700"}`}>
                      {formatINR(balance)}
                    </span>
                    <span className="block mt-0.5 text-[11px] text-gray-500">
                      Funds − Spent
                    </span>
                  </div>
                </div>
              </div>

              {/* Add Investment Form Card */}
              <div className="rounded-lg border border-gray-200 bg-white">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-[15px] font-semibold text-gray-900 tracking-tight">
                    Record Startup Investment
                  </h2>
                  <p className="text-[13px] text-gray-500 mt-0.5">
                    Money your investor pours into the startup. Tracked separately from the spendable balance.
                  </p>
                </div>

                <div className="p-6">
                  <form onSubmit={handleInvestmentSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="investment-date-picker-btn" className="text-[12px] font-medium text-gray-700">Date</Label>
                        <DatePicker
                          id="investment-date-picker-btn"
                          value={investmentDate}
                          onChange={(newDate) => setInvestmentDate(newDate)}
                          placeholder="Pick a date"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="investment-amount" className="text-[12px] font-medium text-gray-700">Amount (₹)</Label>
                        <Input
                          id="investment-amount"
                          type="number"
                          step="0.01"
                          min="1"
                          placeholder="e.g. 500000"
                          value={investmentAmount}
                          onChange={(e) => setInvestmentAmount(e.target.value)}
                          required
                          className="h-9 text-[13px] rounded-md border-gray-200 focus:border-navy font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="investment-bill-upload" className="text-[12px] font-medium text-gray-700">Receipt / Agreement</Label>
                        <input
                          id="investment-bill-upload"
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => setInvestmentFile(e.target.files?.[0] || null)}
                          className="w-full text-[12px] text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border file:border-gray-200 file:text-[12px] file:font-medium file:bg-gray-50 hover:file:bg-gray-100 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="investment-note" className="text-[12px] font-medium text-gray-700">Note (Optional)</Label>
                      <Input
                        id="investment-note"
                        type="text"
                        placeholder="e.g. Second seed tranche for product development"
                        value={investmentNote}
                        onChange={(e) => setInvestmentNote(e.target.value)}
                        className="h-9 text-[13px] rounded-md border-gray-200 focus:border-navy"
                      />
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        type="submit"
                        disabled={investmentSubmitting}
                        className="min-w-[140px] text-[13px] font-medium bg-navy hover:bg-navy-dark text-white rounded-md h-9"
                      >
                        {investmentSubmitting ? "Saving..." : "Record Investment"}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Investments Log */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[15px] font-semibold text-gray-900 tracking-tight">Investment Log</h3>
                    <p className="text-[13px] text-gray-500">
                      Non-expense investments you upload directly, newest first • Direct total: {formatINR(investmentEntriesTotal)} (expenses auto-count toward Total Invested)
                    </p>
                  </div>
                  <div className="text-[12px] font-mono text-gray-500">
                    {investments.length} entries
                  </div>
                </div>

                {investmentsLoading ? (
                  <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500 text-[13px]">
                    Fetching investment log...
                  </div>
                ) : investments.length === 0 ? (
                  <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500 text-[13px]">
                    No investments recorded yet. Use the form above when your investor puts money in.
                  </div>
                ) : (
                  <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
                    {investments.map((investment) => (
                      <div
                        key={investment.id}
                        className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-gray-900">
                            {investment.date || "No date"}
                          </div>
                          {investment.note ? (
                            <div className="text-[12px] text-gray-500 truncate">{investment.note}</div>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[13px] font-bold font-mono tabular-nums text-[#B8860B]">
                            +{formatINR(investment.amount)}
                          </span>
                          {investment.bill_url ? (
                            <a
                              href={investment.bill_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-semibold text-navy hover:underline whitespace-nowrap"
                            >
                              VIEW BILL
                            </a>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => openEditInvestment(investment)}
                            className="p-1 text-gray-400 hover:text-navy transition-colors cursor-pointer rounded"
                            title="Edit investment / attach receipt"
                            aria-label="Edit investment"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setInvestmentToDelete(investment)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors cursor-pointer rounded"
                            title="Delete investment"
                            aria-label="Delete investment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : activeTab === "funds" ? (
            /* 3. ADMIN DASHBOARD — FUNDS RECEIVED SECTION */
            <>
              {/* Add Fund Form Card */}
              <div className="rounded-lg border border-gray-200 bg-white">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-[15px] font-semibold text-gray-900 tracking-tight">
                    Record Funds Received
                  </h2>
                  <p className="text-[13px] text-gray-500 mt-0.5">
                    Every time your client hands you money, log it here. Balance = Funds − Spent
                  </p>
                </div>

                <div className="p-6">
                  <form onSubmit={handleFundSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="fund-date-picker-btn" className="text-[12px] font-medium text-gray-700">Date</Label>
                        <DatePicker
                          id="fund-date-picker-btn"
                          value={fundDate}
                          onChange={(newDate) => setFundDate(newDate)}
                          placeholder="Pick a date"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="fund-amount" className="text-[12px] font-medium text-gray-700">Amount (₹)</Label>
                        <Input
                          id="fund-amount"
                          type="number"
                          step="0.01"
                          min="1"
                          placeholder="e.g. 100000"
                          value={fundAmount}
                          onChange={(e) => setFundAmount(e.target.value)}
                          required
                          className="h-9 text-[13px] rounded-md border-gray-200 focus:border-navy font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="fund-bill-upload" className="text-[12px] font-medium text-gray-700">Receipt Voucher</Label>
                        <input
                          id="fund-bill-upload"
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => setFundFile(e.target.files?.[0] || null)}
                          className="w-full text-[12px] text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border file:border-gray-200 file:text-[12px] file:font-medium file:bg-gray-50 hover:file:bg-gray-100 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="fund-note" className="text-[12px] font-medium text-gray-700">Note (Optional)</Label>
                      <Input
                        id="fund-note"
                        type="text"
                        placeholder="e.g. Cash received for October hosting"
                        value={fundNote}
                        onChange={(e) => setFundNote(e.target.value)}
                        className="h-9 text-[13px] rounded-md border-gray-200 focus:border-navy"
                      />
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        type="submit"
                        disabled={fundSubmitting}
                        className="min-w-[140px] text-[13px] font-medium bg-navy hover:bg-navy-dark text-white rounded-md h-9"
                      >
                        {fundSubmitting ? "Saving..." : "Record Funds"}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Funds Log */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[15px] font-semibold text-gray-900 tracking-tight">Funds Log</h3>
                    <p className="text-[13px] text-gray-500">
                      Money received from the client, newest first
                    </p>
                  </div>
                  <div className="text-[12px] font-mono text-gray-500">
                    {funds.length} entries
                  </div>
                </div>

                {fundsLoading ? (
                  <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500 text-[13px]">
                    Fetching funds log...
                  </div>
                ) : funds.length === 0 ? (
                  <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500 text-[13px]">
                    No funds recorded yet. Use the form above when your client hands you money.
                  </div>
                ) : (
                  <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
                    {funds.map((fund) => (
                      <div
                        key={fund.id}
                        className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-gray-900">
                            {fund.date || "No date"}
                          </div>
                          {fund.note ? (
                            <div className="text-[12px] text-gray-500 truncate">{fund.note}</div>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[13px] font-bold font-mono tabular-nums text-emerald-700">
                            +{formatINR(fund.amount)}
                          </span>
                          {fund.bill_url ? (
                            <a
                              href={fund.bill_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-semibold text-navy hover:underline whitespace-nowrap"
                            >
                              VIEW BILL
                            </a>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => openEditFund(fund)}
                            className="p-1 text-gray-400 hover:text-navy transition-colors cursor-pointer rounded"
                            title="Edit fund entry / attach receipt"
                            aria-label="Edit fund entry"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setFundToDelete(fund)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors cursor-pointer rounded"
                            title="Delete fund entry"
                            aria-label="Delete fund entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* 1. ADD EXPENSE FORM & RECORDED ENTRIES */
            <>
              {/* Add Expense Form Card */}
              <div className="rounded-lg border border-gray-200 bg-white">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-[15px] font-semibold text-gray-900 tracking-tight">
                    Log New Client Expense
                  </h2>
                  <p className="text-[13px] text-gray-500 mt-0.5">
                    Attach bills, invoices, and specify category for client audit transparency
                  </p>
                </div>

                <div className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Date with Calendar Picker */}
                      <div className="space-y-1.5">
                        <Label htmlFor="date-picker-btn" className="text-[12px] font-medium text-gray-700">Date</Label>
                        <DatePicker
                          id="date-picker-btn"
                          value={date}
                          onChange={(newDate) => setDate(newDate)}
                          placeholder="Pick a date"
                        />
                      </div>

                      {/* Category Dropdown from categories table */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="category" className="text-[12px] font-medium text-gray-700">Category</Label>
                          <button
                            type="button"
                            onClick={() => setIsAddCategoryOpen(true)}
                            className="text-[11px] text-navy font-semibold hover:underline cursor-pointer"
                          >
                            + New
                          </button>
                        </div>
                        <Select
                          id="category"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          disabled={categoriesList.length === 0}
                          className="h-9 text-[13px] rounded-md border-gray-200 focus:border-navy"
                        >
                          {categoriesList.length === 0 ? (
                            <option value="">Add a category first</option>
                          ) : (
                            categoriesList.map((catItem) => (
                              <option key={catItem.id || catItem.name} value={catItem.name}>
                                {catItem.name}
                              </option>
                            ))
                          )}
                        </Select>
                      </div>

                      {/* Amount (₹) */}
                      <div className="space-y-1.5">
                        <Label htmlFor="amount" className="text-[12px] font-medium text-gray-700">Amount (₹)</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          min="1"
                          placeholder="e.g. 4500"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          required
                          className="h-9 text-[13px] rounded-md border-gray-200 focus:border-navy font-mono"
                        />
                      </div>

                      {/* Bill Upload */}
                      <div className="space-y-1.5">
                        <Label htmlFor="bill-upload" className="text-[12px] font-medium text-gray-700">Receipt Voucher</Label>
                        <input
                          id="bill-upload"
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => setFile(e.target.files?.[0] || null)}
                          className="w-full text-[12px] text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border file:border-gray-200 file:text-[12px] file:font-medium file:bg-gray-50 hover:file:bg-gray-100 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                      <Label htmlFor="description" className="text-[12px] font-medium text-gray-700">Description</Label>
                      <Input
                        id="description"
                        type="text"
                        placeholder="e.g. AWS Cloud Hosting - Prod Server Reserved Instance"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                        className="h-9 text-[13px] rounded-md border-gray-200 focus:border-navy"
                      />
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                      <Label htmlFor="notes" className="text-[12px] font-medium text-gray-700">Client Audit Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Add breakdown rationale or invoice reference IDs..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        className="text-[13px] rounded-md border-gray-200 focus:border-navy"
                      />
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        type="submit"
                        disabled={submitting || categoriesList.length === 0}
                        className="min-w-[140px] text-[13px] font-medium bg-navy hover:bg-navy-dark text-white rounded-md h-9"
                      >
                        {submitting ? "Uploading..." : "Record Expense"}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Manage Recorded Expenses Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[15px] font-semibold text-gray-900 tracking-tight">Recorded Ledger Entries</h3>
                    <p className="text-[13px] text-gray-500">
                      Manage or remove transactions currently visible on the client ledger
                    </p>
                  </div>
                  <div className="text-[12px] font-mono text-gray-500">
                    {filteredExpenses.length} entries
                  </div>
                </div>

                {loading ? (
                  <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500 text-[13px]">
                    Fetching expense log...
                  </div>
                ) : (
                  <ExpenseTable
                    expenses={filteredExpenses}
                    onEdit={openEditExpense}
                    onDelete={handleDelete}
                    isAdmin={true}
                    categoryColorMap={categoryColorMap}
                  />
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* MODAL 1: ADD NEW CATEGORY DIALOG */}
      <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
        <div className="relative">
          <DialogClose onClick={() => setIsAddCategoryOpen(false)} />
          <DialogHeader>
            <DialogTitle className="text-base text-navy font-bold">Add New Category</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Create a custom expenditure label and color for invoices and vouchers.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCategory} className="space-y-4 mt-4">
            {/* Category Name */}
            <div className="space-y-1.5">
              <Label htmlFor="category-name-input" className="text-xs font-semibold text-gray-700">
                Category Name
              </Label>
              <Input
                id="category-name-input"
                type="text"
                placeholder="e.g. Marketing, Legal, Server Costs"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                required
                className="h-9 text-xs border-gray-200 focus:border-navy"
                autoFocus
              />
            </div>

            {/* Color Picker & Preset Swatches */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700">Badge Color</Label>
              <div className="flex items-center gap-3">
                {/* Native Color Picker */}
                <div className="flex items-center gap-2 border border-gray-200 rounded-md p-1.5 bg-gray-50">
                  <input
                    type="color"
                    id="cat-color-picker"
                    value={newCategoryColor}
                    onChange={(e) => setNewCategoryColor(e.target.value)}
                    className="w-7 h-7 rounded border-0 cursor-pointer p-0 bg-transparent"
                  />
                  <span className="font-mono text-xs text-gray-600 uppercase">
                    {newCategoryColor}
                  </span>
                </div>

                {/* Preset Swatches */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_COLORS.map((swatch) => (
                    <button
                      key={swatch.value}
                      type="button"
                      onClick={() => setNewCategoryColor(swatch.value)}
                      className={`w-6 h-6 rounded-full border transition-transform cursor-pointer ${
                        newCategoryColor.toLowerCase() === swatch.value.toLowerCase()
                          ? "ring-2 ring-offset-1 ring-navy scale-110"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: swatch.value }}
                      title={swatch.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="p-3 bg-gray-50 rounded-md border border-gray-200 flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                Preview Badge:
              </span>
              <span
                className="inline-flex items-center text-[11px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-sm bg-transparent"
                style={{
                  border: `1px solid ${newCategoryColor}`,
                  color: newCategoryColor
                }}
              >
                {newCategoryName.trim().toUpperCase() || "PREVIEW"}
              </span>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAddCategoryOpen(false)}
                className="text-xs text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingCategory || !newCategoryName.trim()}
                className="text-xs font-semibold bg-navy hover:bg-navy-dark text-white"
              >
                {savingCategory ? "Saving..." : "Save Category"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </Dialog>

      {/* MODAL 2: CONFIRM DELETE CATEGORY DIALOG */}
      <Dialog open={Boolean(categoryToDelete)} onOpenChange={() => setCategoryToDelete(null)}>
        <div className="relative">
          <DialogClose onClick={() => setCategoryToDelete(null)} />
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-2 mx-auto sm:mx-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base text-gray-900 font-bold">
              Delete "{categoryToDelete?.name}" Category?
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 leading-relaxed">
              This category will be removed from future expense dropdown options. Existing ledger transactions logged under "{categoryToDelete?.name}" will NOT be deleted.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCategoryToDelete(null)}
              className="text-xs text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDeleteCategory}
              className="text-xs font-semibold bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Category
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
      {/* MODAL 3: CONFIRM DELETE FUND DIALOG */}
      <Dialog open={Boolean(fundToDelete)} onOpenChange={() => setFundToDelete(null)}>
        <div className="relative">
          <DialogClose onClick={() => setFundToDelete(null)} />
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-2 mx-auto sm:mx-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base text-gray-900 font-bold">
              Delete Fund Entry?
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 leading-relaxed">
              This will remove {fundToDelete && Number(fundToDelete.amount) ? formatINR(fundToDelete.amount) : "this entry"} from the funds log and the balance will be recalculated.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setFundToDelete(null)}
              className="text-xs text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDeleteFund}
              className="text-xs font-semibold bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Entry
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
      {/* MODAL 4: EDIT EXPENSE DIALOG */}
      <Dialog open={Boolean(editingExpense)} onOpenChange={() => setEditingExpense(null)}>
        <div className="relative">
          <DialogClose onClick={() => setEditingExpense(null)} />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-navy font-bold">
              <Pencil className="w-4 h-4" />
              Edit Expense
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Update any field. Upload a new voucher to attach or replace the receipt.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditExpenseSave} className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-expense-date" className="text-[12px] font-medium text-gray-700">Date</Label>
                <DatePicker
                  id="edit-expense-date"
                  value={editExpDate}
                  onChange={(newDate) => setEditExpDate(newDate)}
                  placeholder="Pick a date"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-expense-category" className="text-[12px] font-medium text-gray-700">Category</Label>
                <Select
                  id="edit-expense-category"
                  value={editExpCategory}
                  onChange={(e) => setEditExpCategory(e.target.value)}
                  className="h-9 text-[13px] rounded-md border-gray-200 focus:border-navy"
                >
                  {categoriesList.map((catItem) => (
                    <option key={catItem.id || catItem.name} value={catItem.name}>
                      {catItem.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-expense-amount" className="text-[12px] font-medium text-gray-700">Amount (₹)</Label>
                <Input
                  id="edit-expense-amount"
                  type="number"
                  step="0.01"
                  min="1"
                  value={editExpAmount}
                  onChange={(e) => setEditExpAmount(e.target.value)}
                  required
                  className="h-9 text-[13px] rounded-md border-gray-200 focus:border-navy font-mono"
                />
              </div>

              {/* Current receipt preview link + optional replacement */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-expense-bill-upload" className="text-[12px] font-medium text-gray-700">Receipt Voucher</Label>
                {editingExpense?.bill_url && !editExpFile ? (
                  <a
                    href={editingExpense.bill_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-[11px] font-semibold text-navy hover:underline"
                  >
                    VIEW CURRENT BILL ↗
                  </a>
                ) : null}
                <input
                  id="edit-expense-bill-upload"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setEditExpFile(e.target.files?.[0] || null)}
                  className="w-full text-[12px] text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border file:border-gray-200 file:text-[12px] file:font-medium file:bg-gray-50 hover:file:bg-gray-100 cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-expense-description" className="text-[12px] font-medium text-gray-700">Description</Label>
              <Input
                id="edit-expense-description"
                type="text"
                value={editExpDescription}
                onChange={(e) => setEditExpDescription(e.target.value)}
                required
                className="h-9 text-[13px] rounded-md border-gray-200 focus:border-navy"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-expense-notes" className="text-[12px] font-medium text-gray-700">Client Audit Notes (Optional)</Label>
              <Textarea
                id="edit-expense-notes"
                value={editExpNotes}
                onChange={(e) => setEditExpNotes(e.target.value)}
                rows={2}
                className="text-[13px] rounded-md border-gray-200 focus:border-navy"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingExpense(null)}
                className="text-xs text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingExpenseEdit}
                className="text-xs font-semibold bg-navy hover:bg-navy-dark text-white"
              >
                {savingExpenseEdit ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </Dialog>

      {/* MODAL 5: EDIT FUND DIALOG */}
      <Dialog open={Boolean(editingFund)} onOpenChange={() => setEditingFund(null)}>
        <div className="relative">
          <DialogClose onClick={() => setEditingFund(null)} />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-navy font-bold">
              <Pencil className="w-4 h-4" />
              Edit Fund Entry
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Update details, or attach the receipt now / replace the current one.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditFundSave} className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-fund-date" className="text-[12px] font-medium text-gray-700">Date</Label>
                <DatePicker
                  id="edit-fund-date"
                  value={editFundDate}
                  onChange={(newDate) => setEditFundDate(newDate)}
                  placeholder="Pick a date"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-fund-amount" className="text-[12px] font-medium text-gray-700">Amount (₹)</Label>
                <Input
                  id="edit-fund-amount"
                  type="number"
                  step="0.01"
                  min="1"
                  value={editFundAmount}
                  onChange={(e) => setEditFundAmount(e.target.value)}
                  required
                  className="h-9 text-[13px] rounded-md border-gray-200 focus:border-navy font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-fund-bill-upload" className="text-[12px] font-medium text-gray-700">Receipt Voucher</Label>
              {editingFund?.bill_url && !editFundFile ? (
                <a
                  href={editingFund.bill_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-[11px] font-semibold text-navy hover:underline"
                >
                  VIEW CURRENT BILL ↗
                </a>
              ) : null}
              <input
                id="edit-fund-bill-upload"
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setEditFundFile(e.target.files?.[0] || null)}
                className="w-full text-[12px] text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border file:border-gray-200 file:text-[12px] file:font-medium file:bg-gray-50 hover:file:bg-gray-100 cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-fund-note" className="text-[12px] font-medium text-gray-700">Note (Optional)</Label>
              <Input
                id="edit-fund-note"
                type="text"
                value={editFundNote}
                onChange={(e) => setEditFundNote(e.target.value)}
                className="h-9 text-[13px] rounded-md border-gray-200 focus:border-navy"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingFund(null)}
                className="text-xs text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingFundEdit}
                className="text-xs font-semibold bg-navy hover:bg-navy-dark text-white"
              >
                {savingFundEdit ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </Dialog>
      {/* MODAL 6: EDIT INVESTMENT DIALOG */}
      <Dialog open={Boolean(editingInvestment)} onOpenChange={() => setEditingInvestment(null)}>
        <div className="relative">
          <DialogClose onClick={() => setEditingInvestment(null)} />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-navy font-bold">
              <Pencil className="w-4 h-4" />
              Edit Investment
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Update details, or attach the receipt now / replace the current one.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditInvestmentSave} className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-investment-date" className="text-[12px] font-medium text-gray-700">Date</Label>
                <DatePicker
                  id="edit-investment-date"
                  value={editInvestmentDate}
                  onChange={(newDate) => setEditInvestmentDate(newDate)}
                  placeholder="Pick a date"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-investment-amount" className="text-[12px] font-medium text-gray-700">Amount (₹)</Label>
                <Input
                  id="edit-investment-amount"
                  type="number"
                  step="0.01"
                  min="1"
                  value={editInvestmentAmount}
                  onChange={(e) => setEditInvestmentAmount(e.target.value)}
                  required
                  className="h-9 text-[13px] rounded-md border-gray-200 focus:border-navy font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-investment-bill-upload" className="text-[12px] font-medium text-gray-700">Receipt / Agreement</Label>
              {editingInvestment?.bill_url && !editInvestmentFile ? (
                <a
                  href={editingInvestment.bill_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-[11px] font-semibold text-navy hover:underline"
                >
                  VIEW CURRENT BILL ↗
                </a>
              ) : null}
              <input
                id="edit-investment-bill-upload"
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setEditInvestmentFile(e.target.files?.[0] || null)}
                className="w-full text-[12px] text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border file:border-gray-200 file:text-[12px] file:font-medium file:bg-gray-50 hover:file:bg-gray-100 cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-investment-note" className="text-[12px] font-medium text-gray-700">Note (Optional)</Label>
              <Input
                id="edit-investment-note"
                type="text"
                value={editInvestmentNote}
                onChange={(e) => setEditInvestmentNote(e.target.value)}
                className="h-9 text-[13px] rounded-md border-gray-200 focus:border-navy"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingInvestment(null)}
                className="text-xs text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingInvestmentEdit}
                className="text-xs font-semibold bg-navy hover:bg-navy-dark text-white"
              >
                {savingInvestmentEdit ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </Dialog>

      {/* MODAL 7: CONFIRM DELETE INVESTMENT DIALOG */}
      <Dialog open={Boolean(investmentToDelete)} onOpenChange={() => setInvestmentToDelete(null)}>
        <div className="relative">
          <DialogClose onClick={() => setInvestmentToDelete(null)} />
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-2 mx-auto sm:mx-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base text-gray-900 font-bold">
              Delete Investment Entry?
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 leading-relaxed">
              This will remove {investmentToDelete && Number(investmentToDelete.amount) ? formatINR(investmentToDelete.amount) : "this entry"} from the investment log and the Total Invested stat will be recalculated.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setInvestmentToDelete(null)}
              className="text-xs text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDeleteInvestment}
              className="text-xs font-semibold bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Entry
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  )
}
