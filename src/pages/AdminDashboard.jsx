import React, { useState, useEffect } from "react"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import ExpenseTable from "@/components/ExpenseTable"
import AdminPasswordGate from "@/components/AdminPasswordGate"
import { MOCK_EXPENSES } from "@/data/mockExpenses"
import { supabase, isSupabaseConfigured } from "@/supabaseClient"
import { fetchCategories, addCategory, deleteCategory } from "@/lib/categoriesService"
import { exportExpensesToPDF } from "@/lib/pdfExport"
import { formatINR } from "@/lib/utils"
import {
  PlusCircle,
  CheckCircle,
  AlertTriangle,
  FolderPlus,
  Trash2,
  Tag,
  AlertCircle
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
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem("admin_authed") === "true"
  })
  const [expenses, setExpenses] = useState([])
  const [categoriesList, setCategoriesList] = useState([])
  const [loading, setLoading] = useState(true)
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("expenses") // "expenses" | "categories"

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

  // Fetch expenses
  const fetchExpenses = async () => {
    setLoading(true)
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from("expenses")
          .select("*")
          .order("id", { ascending: false })

        if (error) {
          console.warn("Error fetching Supabase rows, using fallback state:", error)
          setExpenses(MOCK_EXPENSES)
        } else if (data && data.length > 0) {
          setExpenses(data)
        } else {
          setExpenses([])
        }
      } else {
        const local = localStorage.getItem("bjr_admin_expenses")
        if (local) {
          try {
            setExpenses(JSON.parse(local))
          } catch {
            setExpenses(MOCK_EXPENSES)
          }
        } else {
          setExpenses(MOCK_EXPENSES)
        }
      }
    } catch (err) {
      console.error("Fetch expenses error:", err)
      setExpenses(MOCK_EXPENSES)
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

  useEffect(() => {
    if (isAuthenticated) {
      fetchExpenses()
      loadCategories()
    }
  }, [isAuthenticated])

  const handleLogout = () => {
    sessionStorage.removeItem("admin_authed")
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

          const { data: uploadData, error: uploadError } = await supabase.storage
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

        setStatusMessage({ type: "success", text: "Expense recorded & bill stored successfully in Supabase." })
        await fetchExpenses()
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

  // Handle Delete
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense record?")) return

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from("expenses").delete().eq("id", id)
        if (error) {
          alert(`Error deleting record: ${error.message}`)
          return
        }
        setExpenses((prev) => prev.filter((item) => item.id !== id))
      } catch (err) {
        console.error(err)
      }
    } else {
      const updated = expenses.filter((item) => item.id !== id)
      setExpenses(updated)
      localStorage.setItem("bjr_admin_expenses", JSON.stringify(updated))
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

  const handleDownloadPDF = () => {
    exportExpensesToPDF(filteredExpenses, "BJR Admin Audit")
  }

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

  if (!isAuthenticated) {
    return <AdminPasswordGate onAuthenticated={() => setIsAuthenticated(true)} />
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row text-gray-900">
      {/* Sidebar */}
      <Sidebar
        totalSpent={totalSpent}
        transactionCount={filteredExpenses.length}
        activeFilter={selectedCategory}
        onSelectCategory={setSelectedCategory}
        onDownloadReport={handleDownloadPDF}
        categories={categoryNames}
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

          {/* Top Admin Section Tabs */}
          <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
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
          </div>

          {activeTab === "categories" ? (
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
    </div>
  )
}
