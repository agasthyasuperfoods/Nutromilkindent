// pages/dashboard.jsx  (or wherever your Dashboard component file is)
import Footer from '@/components/Footer'
import Header from '@/components/Header'
import Indent from '@/components/Indent'
import Maindash from '@/components/Maindash'
import React from 'react'

function Dashboard() {
  return (
    // make the page a column flex container and full height
    <div className="min-h-screen flex flex-col">
      <Header />
      {/* main area is flexible; Maindash must fill remaining height */}
      <main className="flex-1">
        <Maindash />
      </main>

      {/* footer wrapper with mt-auto to ensure it's anchored at bottom */}
      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  )
}

export default Dashboard
